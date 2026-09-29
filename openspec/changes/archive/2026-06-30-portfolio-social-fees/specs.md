# Portfolio + Social + Fees — Specifications

## Prices

Live price retrieval for stocks (Yahoo Finance) and crypto (CoinGecko) with Redis caching. The backend is the single source of truth — frontend never calls external APIs directly.

### R1: Fetch single price

The system MUST return the current price for a given symbol.

#### Scenario: Stock price returned
- GIVEN a valid stock symbol (e.g., "AAPL")
- WHEN GET /prices/AAPL is called
- THEN the response MUST contain `symbol`, `price` (number), `source` ("YAHOO"), `currency` ("USD"), and `timestamp`

#### Scenario: Crypto price returned
- GIVEN a valid crypto symbol (e.g., "BTC")
- WHEN GET /prices/BTC is called
- THEN the response MUST contain `symbol`, `price`, `source` ("COINGECKO"), `currency` ("USD"), and `timestamp`

#### Scenario: Invalid symbol
- GIVEN an invalid symbol (e.g., "NONEXISTENT123")
- WHEN GET /prices/NONEXISTENT123 is called
- THEN the system MUST return a 5xx error

### R2: Fetch multiple prices

The system MUST accept a comma-separated list of symbols and return an array of prices.

#### Scenario: Batch price retrieval
- GIVEN symbols "AAPL,BTC,ETH"
- WHEN GET /prices?symbols=AAPL,BTC,ETH is called
- THEN the response MUST be an array of 3 price objects, each with `symbol`, `price`, `source`, `currency`, and `timestamp`

### R3: Redis caching

The system MUST cache prices in Redis for 5 minutes to avoid hitting external API rate limits.

#### Scenario: Cache hit returns fresh data
- GIVEN symbol "AAPL" was fetched within the last 5 minutes
- WHEN GET /prices/AAPL is called
- THEN the system MUST return the cached price WITHOUT calling Yahoo Finance

#### Scenario: Cache miss fetches from API
- GIVEN symbol "AAPL" has NOT been fetched in the last 5 minutes
- WHEN GET /prices/AAPL is called
- THEN the system MUST call Yahoo Finance and cache the result

### R4: Auth required

The system MUST require a valid JWT for all price endpoints.

#### Scenario: Unauthenticated request rejected
- GIVEN no valid JWT cookie
- WHEN GET /prices/AAPL is called
- THEN the system MUST return 401 Unauthorized

---

## Brokers

Broker catalog with fee structures per country and a fee comparison endpoint. Brokers are manually entered (admin) and publicly readable.

### R1: Create broker

The system MUST allow creating a broker with name, slug, country, fee percentages, and supported asset types.

#### Scenario: Broker created successfully
- GIVEN valid broker data (name: "Belo", slug: "belo", country: "AR", feeBuy: 0.5, feeSell: 0.5)
- WHEN POST /brokers is called with the data
- THEN the response MUST return the created broker with an id and 201 status

#### Scenario: Duplicate slug rejected
- GIVEN a broker with slug "belo" already exists
- WHEN POST /brokers is called with slug "belo"
- THEN the system MUST return a 409 Conflict

### R2: List brokers

The system MUST list all active brokers, optionally filtered by country.

#### Scenario: List all brokers
- WHEN GET /brokers is called
- THEN the response MUST be an array of active broker objects

#### Scenario: Filter by country
- WHEN GET /brokers?country=AR is called
- THEN the response MUST only include brokers with country "AR"

### R3: Compare fees across brokers

The system MUST calculate the total cost of buying a given asset amount across brokers in a country, ordered cheapest first.

#### Scenario: Crypto comparison in Argentina
- GIVEN brokers "Belo" (feeBuy: 0.5%) and "Lemon" (feeBuy: 1.0%) exist for country "AR" with CRYPTO support
- WHEN GET /brokers/compare?amount=1000&assetType=CRYPTO&country=AR is called
- THEN the response MUST be an ordered array with Belo first (lower total cost)
- AND each entry MUST include `name`, `feePercent`, `feeAmount`, `totalCost`, and `youGet`

#### Scenario: Unsupported asset type returns empty
- GIVEN no broker in "AR" supports CEDEAR
- WHEN GET /brokers/compare?amount=1000&assetType=CEDEAR&country=AR is called
- THEN the response MUST be an empty array

### R4: Get single broker

The system MUST return a broker by ID.

#### Scenario: Broker found
- GIVEN a valid broker id
- WHEN GET /brokers/:id is called
- THEN the response MUST return the broker object

#### Scenario: Broker not found
- GIVEN a non-existent broker id
- WHEN GET /brokers/:id is called
- THEN the system MUST return 404

### R5: Update broker

The system MUST allow updating broker fields.

#### Scenario: Broker updated
- GIVEN an existing broker
- WHEN PUT /brokers/:id is called with updated `feeBuy`
- THEN the response MUST return the updated broker

### R6: Delete broker

The system MUST allow deleting a broker.

#### Scenario: Broker deleted
- GIVEN an existing broker
- WHEN DELETE /brokers/:id is called
- THEN the system MUST return 204 No Content

### R7: Auth required

The system MUST require a valid JWT for all broker endpoints.

#### Scenario: Unauthenticated request rejected
- GIVEN no valid JWT cookie
- WHEN GET /brokers is called
- THEN the system MUST return 401

---

## Social Portfolio

Social layer for portfolios — users create portfolios with asset allocations, follow others' portfolios, and comment. The foundation for the social feed.

### R1: Create portfolio

The system MUST allow authenticated users to create a portfolio with name, description, thesis, and visibility.

#### Scenario: Public portfolio created
- GIVEN a valid JWT user
- WHEN POST /social/portfolios is called with `{ name: "My Tech Portfolio", visibility: "PUBLIC" }`
- THEN the response MUST return the created portfolio with 201 status
- AND the portfolio MUST be associated with the authenticated user

#### Scenario: Private portfolio created
- GIVEN a valid JWT user
- WHEN POST /social/portfolios is called with `{ name: "Private", visibility: "PRIVATE" }`
- THEN the portfolio MUST NOT appear in public listings

### R2: List portfolios

The system MUST list portfolios, optionally filtered by visibility or user.

#### Scenario: Public feed
- WHEN GET /social/portfolios is called
- THEN the response MUST be an array of portfolios
- AND each entry MUST include the creator's user info and follower/comment counts

#### Scenario: Filter by user
- WHEN GET /social/portfolios?userId=abc is called
- THEN the response MUST only include portfolios owned by user abc

### R3: Get portfolio detail

The system MUST return a portfolio with all assets, followers, and top-level comments.

#### Scenario: Portfolio detail returned
- GIVEN a portfolio with 2 assets and 3 followers
- WHEN GET /social/portfolios/:id is called
- THEN the response MUST include the portfolio, its assets, followers, comments with replies, and counts

#### Scenario: Portfolio not found
- GIVEN a non-existent portfolio id
- WHEN GET /social/portfolios/:id is called
- THEN the system MUST return 404

### R4: Update portfolio

The system MUST allow the portfolio owner to update it.

#### Scenario: Owner updates portfolio
- GIVEN the authenticated user is the portfolio owner
- WHEN PUT /social/portfolios/:id is called with `{ name: "Updated Name" }`
- THEN the response MUST return the updated portfolio

#### Scenario: Non-owner cannot update
- GIVEN the authenticated user is NOT the portfolio owner
- WHEN PUT /social/portfolios/:id is called
- THEN the system MUST return 403 Forbidden

### R5: Delete portfolio

The system MUST allow the portfolio owner to delete their portfolio.

#### Scenario: Owner deletes portfolio
- GIVEN the authenticated user is the portfolio owner
- WHEN DELETE /social/portfolios/:id is called
- THEN the system MUST return 204 No Content
- AND the portfolio and all its assets/comments/followers MUST be removed

### R6: Add asset to portfolio

The system MUST allow the portfolio owner to add assets (symbol, quantity, avg buy price, allocation).

#### Scenario: Asset added
- GIVEN the authenticated user owns the portfolio
- WHEN POST /social/portfolios/:id/assets is called with `{ symbol: "AAPL", type: "STOCK", quantity: 10, avgBuyPrice: 150 }`
- THEN the response MUST return the created asset
- AND the asset MUST be associated with the portfolio

### R7: Remove asset from portfolio

The system MUST allow the portfolio owner to remove an asset.

#### Scenario: Asset removed
- GIVEN an asset belonging to the user's portfolio
- WHEN DELETE /social/assets/:id is called
- THEN the system MUST return 204

### R8: Follow portfolio

The system MUST allow any authenticated user to follow a portfolio.

#### Scenario: Follow portfolio
- GIVEN a valid JWT user and an existing portfolio
- WHEN POST /social/portfolios/:id/follow is called
- THEN the response MUST confirm the follow
- AND the portfolio's follower count MUST increase by 1

#### Scenario: Unfollow portfolio
- GIVEN the user already follows the portfolio
- WHEN DELETE /social/portfolios/:id/follow is called
- THEN the system MUST return 204
- AND the portfolio's follower count MUST decrease by 1

### R9: Comment on portfolio

The system MUST allow authenticated users to comment on portfolios, with one level of nesting.

#### Scenario: Top-level comment
- GIVEN a valid JWT user and an existing portfolio
- WHEN POST /social/portfolios/:id/comments is called with `{ text: "Great portfolio!" }`
- THEN the response MUST return the created comment with user info

#### Scenario: Reply to comment
- GIVEN an existing top-level comment
- WHEN POST /social/portfolios/:id/comments is called with `{ text: "Thanks!", parentId: "comment-id" }`
- THEN the response MUST return the reply with the correct parentId

### R10: Delete comment

The system MUST allow a user to delete their own comment.

#### Scenario: Owner deletes comment
- GIVEN the authenticated user wrote the comment
- WHEN DELETE /social/comments/:id is called
- THEN the system MUST return 204

#### Scenario: Non-owner cannot delete
- GIVEN a comment written by another user
- WHEN DELETE /social/comments/:id is called
- THEN the system MUST return 403
