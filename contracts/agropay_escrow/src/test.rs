#![cfg(test)]

use super::*;
use soroban_sdk::{
    testutils::{Address as _, Ledger},
    Env, String,
};

fn create_token_contract<'a>(env: &Env, admin: &Address) -> (Address, token::StellarAssetClient<'a>, token::Client<'a>) {
    let sac = env.register_stellar_asset_contract_v2(admin.clone());
    let addr = sac.address();
    let asset_client = token::StellarAssetClient::new(env, &addr);
    let client = token::Client::new(env, &addr);
    (addr, asset_client, client)
}

fn setup<'a>() -> (Env, AgroPayEscrowClient<'a>, Address, Address, token::Client<'a>) {
    let env = Env::default();
    env.mock_all_auths();

    let admin = Address::generate(&env);
    let token_admin = Address::generate(&env);
    let (token_addr, token_sac, token_client) = create_token_contract(&env, &token_admin);

    let contract_id = env.register_contract(None, AgroPayEscrow);
    let client = AgroPayEscrowClient::new(&env, &contract_id);
    client.initialize(&admin, &token_addr);

    // mint some tokens to token_sac issuer for tests to distribute
    token_sac.mint(&token_admin, &1_000_000_000);

    (env, client, admin, token_addr, token_client)
}

#[test]
fn test_create_listing_and_place_order() {
    let (env, client, _admin, _token_addr, token_client) = setup();

    let farmer = Address::generate(&env);
    let buyer = Address::generate(&env);

    // fund buyer
    let token_admin_client = token::StellarAssetClient::new(&env, &token_client.address);
    token_admin_client.mint(&buyer, &10_000);

    let listing_id = client.create_listing(
        &farmer,
        &String::from_str(&env, "50kg Rice Bags"),
        &100i128,
        &String::from_str(&env, "bag"),
        &20u32,
    );
    assert_eq!(listing_id, 1);

    let order_id = client.place_order(&buyer, &listing_id, &5u32, &7u32);
    assert_eq!(order_id, 1);

    let order = client.get_order(&order_id);
    assert_eq!(order.amount, 500);
    assert_eq!(order.status, OrderStatus::Funded);

    // funds moved from buyer to contract
    assert_eq!(token_client.balance(&buyer), 9_500);
    assert_eq!(token_client.balance(&client.address), 500);

    let listing = client.get_listing(&listing_id);
    assert_eq!(listing.quantity_available, 15);
}

#[test]
fn test_full_happy_path_release() {
    let (env, client, _admin, _token_addr, token_client) = setup();

    let farmer = Address::generate(&env);
    let buyer = Address::generate(&env);
    let token_admin_client = token::StellarAssetClient::new(&env, &token_client.address);
    token_admin_client.mint(&buyer, &10_000);

    let listing_id = client.create_listing(
        &farmer,
        &String::from_str(&env, "Tomatoes"),
        &50i128,
        &String::from_str(&env, "crate"),
        &10u32,
    );
    let order_id = client.place_order(&buyer, &listing_id, &2u32, &5u32);

    client.mark_delivered(&farmer, &order_id, &String::from_str(&env, "ipfs://proofhash123"));
    let order = client.get_order(&order_id);
    assert_eq!(order.status, OrderStatus::Delivered);

    client.confirm_delivery(&buyer, &order_id);
    let order = client.get_order(&order_id);
    assert_eq!(order.status, OrderStatus::Released);

    // farmer received funds, contract balance zeroed for this order
    assert_eq!(token_client.balance(&farmer), 100);
    assert_eq!(token_client.balance(&client.address), 0);
}

#[test]
fn test_refund_after_deadline() {
    let (env, client, _admin, _token_addr, token_client) = setup();

    let farmer = Address::generate(&env);
    let buyer = Address::generate(&env);
    let token_admin_client = token::StellarAssetClient::new(&env, &token_client.address);
    token_admin_client.mint(&buyer, &10_000);

    let listing_id = client.create_listing(
        &farmer,
        &String::from_str(&env, "Wheat"),
        &200i128,
        &String::from_str(&env, "bag"),
        &5u32,
    );
    let order_id = client.place_order(&buyer, &listing_id, &1u32, &1u32); // 1 day window

    // fast-forward ledger timestamp past the deadline
    env.ledger().with_mut(|li| {
        li.timestamp += 2 * 86_400;
    });

    client.claim_refund(&buyer, &order_id);
    let order = client.get_order(&order_id);
    assert_eq!(order.status, OrderStatus::Refunded);
    assert_eq!(token_client.balance(&buyer), 10_000); // fully refunded
}

#[test]
fn test_refund_fails_before_deadline() {
    let (env, client, _admin, _token_addr, token_client) = setup();

    let farmer = Address::generate(&env);
    let buyer = Address::generate(&env);
    let token_admin_client = token::StellarAssetClient::new(&env, &token_client.address);
    token_admin_client.mint(&buyer, &10_000);

    let listing_id = client.create_listing(
        &farmer,
        &String::from_str(&env, "Corn"),
        &75i128,
        &String::from_str(&env, "sack"),
        &5u32,
    );
    let order_id = client.place_order(&buyer, &listing_id, &1u32, &10u32);

    let result = client.try_claim_refund(&buyer, &order_id);
    assert!(result.is_err());
}

#[test]
fn test_dispute_resolution_favors_farmer() {
    let (env, client, admin, _token_addr, token_client) = setup();

    let farmer = Address::generate(&env);
    let buyer = Address::generate(&env);
    let token_admin_client = token::StellarAssetClient::new(&env, &token_client.address);
    token_admin_client.mint(&buyer, &10_000);

    let listing_id = client.create_listing(
        &farmer,
        &String::from_str(&env, "Mangoes"),
        &30i128,
        &String::from_str(&env, "box"),
        &10u32,
    );
    let order_id = client.place_order(&buyer, &listing_id, &3u32, &5u32);

    client.raise_dispute(&buyer, &order_id);
    assert_eq!(client.get_order(&order_id).status, OrderStatus::Disputed);

    client.resolve_dispute(&admin, &order_id, &true);
    assert_eq!(client.get_order(&order_id).status, OrderStatus::Released);
    assert_eq!(token_client.balance(&farmer), 90);
}

#[test]
fn test_dispute_resolution_favors_buyer() {
    let (env, client, admin, _token_addr, token_client) = setup();

    let farmer = Address::generate(&env);
    let buyer = Address::generate(&env);
    let token_admin_client = token::StellarAssetClient::new(&env, &token_client.address);
    token_admin_client.mint(&buyer, &10_000);

    let listing_id = client.create_listing(
        &farmer,
        &String::from_str(&env, "Onions"),
        &40i128,
        &String::from_str(&env, "sack"),
        &10u32,
    );
    let order_id = client.place_order(&buyer, &listing_id, &2u32, &5u32);

    client.raise_dispute(&buyer, &order_id);
    client.resolve_dispute(&admin, &order_id, &false);

    assert_eq!(client.get_order(&order_id).status, OrderStatus::Refunded);
    assert_eq!(token_client.balance(&buyer), 10_000);
}

#[test]
fn test_insufficient_quantity_rejected() {
    let (env, client, _admin, _token_addr, token_client) = setup();

    let farmer = Address::generate(&env);
    let buyer = Address::generate(&env);
    let token_admin_client = token::StellarAssetClient::new(&env, &token_client.address);
    token_admin_client.mint(&buyer, &10_000);

    let listing_id = client.create_listing(
        &farmer,
        &String::from_str(&env, "Potatoes"),
        &20i128,
        &String::from_str(&env, "sack"),
        &3u32,
    );

    let result = client.try_place_order(&buyer, &listing_id, &10u32, &5u32);
    assert!(result.is_err());
}

#[test]
fn test_non_buyer_cannot_confirm_delivery() {
    let (env, client, _admin, _token_addr, token_client) = setup();

    let farmer = Address::generate(&env);
    let buyer = Address::generate(&env);
    let stranger = Address::generate(&env);
    let token_admin_client = token::StellarAssetClient::new(&env, &token_client.address);
    token_admin_client.mint(&buyer, &10_000);

    let listing_id = client.create_listing(
        &farmer,
        &String::from_str(&env, "Bananas"),
        &10i128,
        &String::from_str(&env, "bunch"),
        &10u32,
    );
    let order_id = client.place_order(&buyer, &listing_id, &1u32, &5u32);

    let result = client.try_confirm_delivery(&stranger, &order_id);
    assert!(result.is_err());
}
