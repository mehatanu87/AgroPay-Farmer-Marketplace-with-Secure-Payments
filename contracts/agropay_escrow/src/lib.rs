#![no_std]

//! AgroPay Escrow Contract
//!
//! Holds buyer funds in escrow when an order is placed against a farmer's
//! listing, and releases them to the farmer only after the buyer confirms
//! delivery. Buyers can raise a dispute before confirming, which freezes
//! release until an admin arbitrates. If a farmer never fulfills, the buyer
//! can reclaim funds after the delivery deadline passes.

use soroban_sdk::{
    contract, contracterror, contractimpl, contracttype, log, symbol_short, token, Address,
    Env, String, Symbol,
};

// ---------------------------------------------------------------------
// Storage keys
// ---------------------------------------------------------------------

#[derive(Clone)]
#[contracttype]
pub enum DataKey {
    Admin,
    Order(u64),
    OrderCount,
    Listing(u64),
    ListingCount,
    TokenAddr,
}

// ---------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
#[contracttype]
pub enum OrderStatus {
    Created = 0,
    Funded = 1,
    Delivered = 2,
    Released = 3,
    Disputed = 4,
    Refunded = 5,
    Cancelled = 6,
}

#[derive(Clone)]
#[contracttype]
pub struct Listing {
    pub id: u64,
    pub farmer: Address,
    pub title: String,
    pub price_per_unit: i128,
    pub unit: String,
    pub quantity_available: u32,
    pub active: bool,
}

#[derive(Clone)]
#[contracttype]
pub struct Order {
    pub id: u64,
    pub listing_id: u64,
    pub farmer: Address,
    pub buyer: Address,
    pub amount: i128,
    pub quantity: u32,
    pub status: OrderStatus,
    pub created_at: u64,
    pub delivery_deadline: u64,
    pub proof_hash: String,
}

#[contracterror]
#[derive(Copy, Clone, Debug, Eq, PartialEq, PartialOrd, Ord)]
#[repr(u32)]
pub enum Error {
    NotAuthorized = 1,
    ListingNotFound = 2,
    ListingInactive = 3,
    InsufficientQuantity = 4,
    OrderNotFound = 5,
    InvalidStatus = 6,
    DeadlineNotPassed = 7,
    DeadlinePassed = 8,
    AlreadyInitialized = 9,
    InvalidAmount = 10,
}

const DAY_IN_LEDGERS: u32 = 17280; // ~ 1 day at 5s/ledger
const MAX_TTL: u32 = DAY_IN_LEDGERS * 30;
const BUMP_TTL: u32 = DAY_IN_LEDGERS * 29;

#[contract]
pub struct AgroPayEscrow;

#[contractimpl]
impl AgroPayEscrow {
    /// One-time setup. `token` is the Stellar Asset Contract address used
    /// for payments (e.g. USDC or native XLM SAC on testnet).
    pub fn initialize(env: Env, admin: Address, token: Address) -> Result<(), Error> {
        if env.storage().instance().has(&DataKey::Admin) {
            return Err(Error::AlreadyInitialized);
        }
        admin.require_auth();
        env.storage().instance().set(&DataKey::Admin, &admin);
        env.storage().instance().set(&DataKey::TokenAddr, &token);
        env.storage().instance().set(&DataKey::OrderCount, &0u64);
        env.storage().instance().set(&DataKey::ListingCount, &0u64);
        env.storage().instance().extend_ttl(MAX_TTL, MAX_TTL);
        Ok(())
    }

    // -----------------------------------------------------------------
    // Listings
    // -----------------------------------------------------------------

    pub fn create_listing(
        env: Env,
        farmer: Address,
        title: String,
        price_per_unit: i128,
        unit: String,
        quantity_available: u32,
    ) -> Result<u64, Error> {
        farmer.require_auth();
        if price_per_unit <= 0 {
            return Err(Error::InvalidAmount);
        }

        let mut count: u64 = env
            .storage()
            .instance()
            .get(&DataKey::ListingCount)
            .unwrap_or(0);
        count += 1;

        let listing = Listing {
            id: count,
            farmer: farmer.clone(),
            title,
            price_per_unit,
            unit,
            quantity_available,
            active: true,
        };

        env.storage()
            .persistent()
            .set(&DataKey::Listing(count), &listing);
        env.storage()
            .persistent()
            .extend_ttl(&DataKey::Listing(count), BUMP_TTL, MAX_TTL);
        env.storage().instance().set(&DataKey::ListingCount, &count);

        log!(&env, "listing created: {}", count);
        env.events()
            .publish((symbol_short!("listing"), symbol_short!("created")), count);

        Ok(count)
    }

    pub fn set_listing_active(env: Env, farmer: Address, listing_id: u64, active: bool) -> Result<(), Error> {
        farmer.require_auth();
        let mut listing = Self::get_listing(env.clone(), listing_id)?;
        if listing.farmer != farmer {
            return Err(Error::NotAuthorized);
        }
        listing.active = active;
        env.storage()
            .persistent()
            .set(&DataKey::Listing(listing_id), &listing);
        Ok(())
    }

    pub fn get_listing(env: Env, listing_id: u64) -> Result<Listing, Error> {
        env.storage()
            .persistent()
            .get(&DataKey::Listing(listing_id))
            .ok_or(Error::ListingNotFound)
    }

    // -----------------------------------------------------------------
    // Orders / Escrow
    // -----------------------------------------------------------------

    /// Buyer places an order and immediately funds escrow by transferring
    /// `amount` of the payment token from buyer to this contract.
    pub fn place_order(
        env: Env,
        buyer: Address,
        listing_id: u64,
        quantity: u32,
        delivery_window_days: u32,
    ) -> Result<u64, Error> {
        buyer.require_auth();

        let mut listing = Self::get_listing(env.clone(), listing_id)?;
        if !listing.active {
            return Err(Error::ListingInactive);
        }
        if listing.quantity_available < quantity {
            return Err(Error::InsufficientQuantity);
        }

        let amount = listing.price_per_unit * (quantity as i128);
        if amount <= 0 {
            return Err(Error::InvalidAmount);
        }

        // Transfer funds from buyer into contract custody (escrow).
        let token_addr: Address = env.storage().instance().get(&DataKey::TokenAddr).unwrap();
        let token_client = token::Client::new(&env, &token_addr);
        token_client.transfer(&buyer, &env.current_contract_address(), &amount);

        listing.quantity_available -= quantity;
        env.storage()
            .persistent()
            .set(&DataKey::Listing(listing_id), &listing);

        let mut count: u64 = env
            .storage()
            .instance()
            .get(&DataKey::OrderCount)
            .unwrap_or(0);
        count += 1;

        let now = env.ledger().timestamp();
        let deadline = now + (delivery_window_days as u64) * 86_400;

        let order = Order {
            id: count,
            listing_id,
            farmer: listing.farmer.clone(),
            buyer: buyer.clone(),
            amount,
            quantity,
            status: OrderStatus::Funded,
            created_at: now,
            delivery_deadline: deadline,
            proof_hash: String::from_str(&env, ""),
        };

        env.storage().persistent().set(&DataKey::Order(count), &order);
        env.storage()
            .persistent()
            .extend_ttl(&DataKey::Order(count), BUMP_TTL, MAX_TTL);
        env.storage().instance().set(&DataKey::OrderCount, &count);

        env.events()
            .publish((symbol_short!("order"), symbol_short!("funded")), count);

        Ok(count)
    }

    /// Farmer marks the order as delivered and attaches an off-chain proof
    /// reference (e.g. IPFS hash or hash of delivery receipt/photo).
    pub fn mark_delivered(
        env: Env,
        farmer: Address,
        order_id: u64,
        proof_hash: String,
    ) -> Result<(), Error> {
        farmer.require_auth();
        let mut order = Self::get_order(env.clone(), order_id)?;
        if order.farmer != farmer {
            return Err(Error::NotAuthorized);
        }
        if order.status != OrderStatus::Funded {
            return Err(Error::InvalidStatus);
        }

        order.status = OrderStatus::Delivered;
        order.proof_hash = proof_hash;
        env.storage().persistent().set(&DataKey::Order(order_id), &order);

        env.events()
            .publish((symbol_short!("order"), symbol_short!("delivered")), order_id);
        Ok(())
    }

    /// Buyer confirms receipt — releases escrowed funds to the farmer.
    pub fn confirm_delivery(env: Env, buyer: Address, order_id: u64) -> Result<(), Error> {
        buyer.require_auth();
        let mut order = Self::get_order(env.clone(), order_id)?;
        if order.buyer != buyer {
            return Err(Error::NotAuthorized);
        }
        if order.status != OrderStatus::Delivered && order.status != OrderStatus::Funded {
            return Err(Error::InvalidStatus);
        }

        Self::release_funds(&env, &order)?;

        order.status = OrderStatus::Released;
        env.storage().persistent().set(&DataKey::Order(order_id), &order);

        env.events()
            .publish((symbol_short!("order"), symbol_short!("released")), order_id);
        Ok(())
    }

    /// Buyer disputes an order before confirming — freezes funds pending
    /// admin arbitration.
    pub fn raise_dispute(env: Env, buyer: Address, order_id: u64) -> Result<(), Error> {
        buyer.require_auth();
        let mut order = Self::get_order(env.clone(), order_id)?;
        if order.buyer != buyer {
            return Err(Error::NotAuthorized);
        }
        if order.status == OrderStatus::Released || order.status == OrderStatus::Refunded {
            return Err(Error::InvalidStatus);
        }
        order.status = OrderStatus::Disputed;
        env.storage().persistent().set(&DataKey::Order(order_id), &order);

        env.events()
            .publish((symbol_short!("order"), symbol_short!("dispute")), order_id);
        Ok(())
    }

    /// Admin arbitrates a disputed order: release to farmer or refund buyer.
    pub fn resolve_dispute(env: Env, admin: Address, order_id: u64, release_to_farmer: bool) -> Result<(), Error> {
        Self::require_admin(&env, &admin)?;
        let mut order = Self::get_order(env.clone(), order_id)?;
        if order.status != OrderStatus::Disputed {
            return Err(Error::InvalidStatus);
        }

        if release_to_farmer {
            Self::release_funds(&env, &order)?;
            order.status = OrderStatus::Released;
        } else {
            Self::refund_funds(&env, &order)?;
            order.status = OrderStatus::Refunded;
        }
        env.storage().persistent().set(&DataKey::Order(order_id), &order);

        env.events()
            .publish((symbol_short!("order"), symbol_short!("resolved")), order_id);
        Ok(())
    }

    /// Buyer reclaims funds if the farmer never delivered by the deadline.
    pub fn claim_refund(env: Env, buyer: Address, order_id: u64) -> Result<(), Error> {
        buyer.require_auth();
        let mut order = Self::get_order(env.clone(), order_id)?;
        if order.buyer != buyer {
            return Err(Error::NotAuthorized);
        }
        if order.status != OrderStatus::Funded {
            return Err(Error::InvalidStatus);
        }
        if env.ledger().timestamp() < order.delivery_deadline {
            return Err(Error::DeadlineNotPassed);
        }

        Self::refund_funds(&env, &order)?;
        order.status = OrderStatus::Refunded;
        env.storage().persistent().set(&DataKey::Order(order_id), &order);

        env.events()
            .publish((symbol_short!("order"), symbol_short!("refunded")), order_id);
        Ok(())
    }

    pub fn get_order(env: Env, order_id: u64) -> Result<Order, Error> {
        env.storage()
            .persistent()
            .get(&DataKey::Order(order_id))
            .ok_or(Error::OrderNotFound)
    }

    pub fn get_order_count(env: Env) -> u64 {
        env.storage().instance().get(&DataKey::OrderCount).unwrap_or(0)
    }

    pub fn get_listing_count(env: Env) -> u64 {
        env.storage().instance().get(&DataKey::ListingCount).unwrap_or(0)
    }

    // -----------------------------------------------------------------
    // Internal helpers
    // -----------------------------------------------------------------

    fn require_admin(env: &Env, caller: &Address) -> Result<(), Error> {
        caller.require_auth();
        let admin: Address = env.storage().instance().get(&DataKey::Admin).unwrap();
        if &admin != caller {
            return Err(Error::NotAuthorized);
        }
        Ok(())
    }

    fn release_funds(env: &Env, order: &Order) -> Result<(), Error> {
        let token_addr: Address = env.storage().instance().get(&DataKey::TokenAddr).unwrap();
        let token_client = token::Client::new(env, &token_addr);
        token_client.transfer(&env.current_contract_address(), &order.farmer, &order.amount);
        Ok(())
    }

    fn refund_funds(env: &Env, order: &Order) -> Result<(), Error> {
        let token_addr: Address = env.storage().instance().get(&DataKey::TokenAddr).unwrap();
        let token_client = token::Client::new(env, &token_addr);
        token_client.transfer(&env.current_contract_address(), &order.buyer, &order.amount);
        Ok(())
    }
}

mod test;
