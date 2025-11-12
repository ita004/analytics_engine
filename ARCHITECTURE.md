# Architecture Documentation

## System Overview

The Analytics Engine is a high-performance, scalable backend system designed to collect, store, and analyze millions of analytics events from web and mobile applications.

## Core Components

### 1. API Layer (Express.js)
- **Purpose:** Handle HTTP requests and responses
- **Components:**
  - Route handlers
  - Middleware pipeline
  - Request validation
  - Error handling
- **Key Features:**
  - RESTful API design
  - Session-based authentication
  - API key authentication
  - Rate limiting
  - CORS handling

### 2. Authentication System
- **Google OAuth 2.0**
  - User registration/login
  - Profile information
  - Secure session management
- **API Key Management**
  - Generation and storage
  - Validation middleware
  - Expiration handling
  - Revocation support

### 3. Data Layer

#### PostgreSQL Database
- **Primary data store** for all persistent data
- **Tables:**
  - `users` - Authenticated users
  - `api_keys` - API key credentials
  - `events` - Analytics events (high volume)
- **Optimizations:**
  - Strategic indexing
  - Materialized views
  - Partitioning ready
  - Connection pooling

#### Redis Cache
- **Purpose:** Speed up frequent queries
- **Usage:**
  - Event summaries
  - User statistics
  - Session storage
- **Strategy:** Cache-aside with TTL

### 4. Business Logic Layer

#### Controllers
- `authController` - User and API key management
- `analyticsController` - Event collection and analytics

#### Services (Implicit)
- User agent parsing
- IP address extraction
- Data aggregation
- Cache management

### 5. Middleware Stack
- **Security:** Helmet, CORS
- **Authentication:** Passport.js, Custom API key validator
- **Validation:** Joi schemas
- **Rate Limiting:** Express rate limit
- **Logging:** Winston, Morgan
- **Error Handling:** Centralized error middleware

## Data Flow

### Event Collection Flow
```
Client Request
    ↓
Rate Limiter
    ↓
API Key Validation
    ↓
Request Validation (Joi)
    ↓
Parse User Agent
    ↓
Enrich Event Data
    ↓
Insert to PostgreSQL
    ↓
Invalidate Cache
    ↓
Return Success Response
```

### Analytics Query Flow
```
Client Request
    ↓
Rate Limiter
    ↓
Session Authentication
    ↓
Query Validation
    ↓
Check Redis Cache
    ↓ (cache miss)
Query PostgreSQL
    ↓
Store in Redis Cache
    ↓
Return Response
```

## Database Schema Design

### Users Table
```sql
users
├── id (UUID, PK)
├── google_id (Unique)
├── email (Unique)
├── name
├── profile_picture
├── created_at
└── updated_at
```

### API Keys Table
```sql
api_keys
├── id (UUID, PK)
├── user_id (FK → users)
├── app_name
├── app_domain
├── api_key (Unique)
├── is_active
├── expires_at
├── created_at
├── revoked_at
└── last_used_at
```

### Events Table
```sql
events
├── id (UUID, PK)
├── api_key_id (FK → api_keys)
├── event_name (Indexed)
├── url
├── referrer
├── device (Indexed)
├── ip_address
├── user_agent
├── browser
├── os
├── screen_size
├── user_id (Indexed)
├── metadata (JSONB, GIN indexed)
├── timestamp (Indexed)
└── created_at

Composite Index: (api_key_id, event_name, timestamp)
```

## Security Architecture

### Authentication Layers
1. **User Authentication** - Google OAuth with session cookies
2. **API Authentication** - API key in X-API-Key header
3. **Authorization** - User can only access their own data

### Security Measures
- Helmet.js for HTTP headers
- CORS configuration
- Rate limiting (multiple tiers)
- Input validation
- SQL injection prevention
- XSS protection
- Secure session cookies
- Environment variable protection

## Scalability Design

### Horizontal Scaling
- **Stateless API** - No in-memory state
- **Session storage** - Can be moved to Redis
- **Database connection pooling**
- **Load balancer ready**

### Vertical Scaling
- **Database optimization** - Indexes, materialized views
- **Query optimization** - Efficient SQL
- **Caching strategy** - Redis for hot data

### Future Scaling Options
- Database read replicas
- Table partitioning by date
- Sharding by user_id
- Message queue for async processing
- CDN for static assets

## Performance Optimizations

### Database Level
1. **Indexes on high-query columns**
   - event_name, timestamp, user_id, device
   - Composite index for common queries
2. **Materialized views** for heavy aggregations
3. **Connection pooling** (max 20 connections)
4. **Prepared statements** to prevent SQL injection and improve performance

### Application Level
1. **Redis caching** with smart TTL
2. **Cache invalidation** on data changes
3. **Async operations** where possible
4. **Streaming for large datasets**

### Infrastructure Level
1. **Docker containerization**
2. **Health check endpoint**
3. **Graceful shutdown**
4. **Resource limits**

## Monitoring and Observability

### Logging
- **Winston** for structured logging
- **Morgan** for HTTP request logging
- Log levels: error, warn, info, debug
- Separate log files for errors

### Metrics to Monitor
- Request rate
- Response time
- Error rate
- Database query time
- Cache hit ratio
- API key usage
- Event collection rate

### Health Checks
- `/health` endpoint
- Database connectivity
- Redis connectivity
- System resources

## Error Handling Strategy

### Error Types
1. **Validation Errors** (400) - Bad request format
2. **Authentication Errors** (401) - Invalid credentials
3. **Authorization Errors** (403) - Insufficient permissions
4. **Not Found Errors** (404) - Resource doesn't exist
5. **Rate Limit Errors** (429) - Too many requests
6. **Server Errors** (500) - Internal failures

### Error Response Format
```json
{
  "success": false,
  "message": "Error description",
  "errors": [/* validation details */]
}
```

## API Design Principles

### RESTful Design
- Resource-based URLs
- HTTP methods (GET, POST, PUT, DELETE)
- Status codes for responses
- JSON request/response format

### Rate Limiting Strategy
- Auth endpoints: 20 req/15min
- Event collection: 1000 req/min per API key
- Analytics queries: 60 req/min
- General API: 100 req/15min

### Versioning
- Currently v1
- Version in URL path: `/api/v1/`
- Backward compatibility maintained

## Testing Strategy

### Unit Tests
- Utility functions
- Data parsers
- Validation logic

### Integration Tests
- API endpoints
- Database operations
- Cache operations

### Test Coverage Goals
- Core logic: >90%
- API routes: >80%
- Overall: >75%

## Deployment Architecture

### Development
```
Local Machine
├── Node.js app
├── PostgreSQL (local)
└── Redis (local)
```

### Production
```
Cloud Platform (Render/Railway)
├── Web Service (Docker)
├── PostgreSQL (Managed)
├── Redis (Managed)
└── Load Balancer
```

## Technology Choices and Rationale

### TypeScript over JavaScript
- Type safety reduces bugs
- Better IDE support
- Self-documenting code
- Easier refactoring

### PostgreSQL over MongoDB
- ACID compliance needed
- Complex queries and joins
- Mature ecosystem
- Better for analytics

### Redis over Memcached
- Rich data structures
- Persistence option
- Better monitoring
- Active development

### Express over Fastify/Koa
- Mature ecosystem
- Extensive middleware
- Better documentation
- Team familiarity

## Future Architecture Considerations

### When to Optimize Further
- **Event volume > 10M/day:** Add message queue (RabbitMQ/Kafka)
- **Users > 10K:** Add database read replicas
- **Global users:** Add CDN and multi-region deployment
- **Complex analytics:** Add data warehouse (BigQuery/Redshift)

### Potential Enhancements
1. **Microservices split**
   - Auth service
   - Collection service
   - Analytics service
2. **Event streaming**
   - WebSocket support
   - Server-sent events
3. **Machine Learning**
   - Anomaly detection
   - Predictive analytics
4. **Advanced caching**
   - CDN for static content
   - Edge computing

## Conclusion

This architecture is designed for:
- **High performance** - Handles millions of events
- **Scalability** - Easy to scale horizontally
- **Reliability** - Proper error handling and monitoring
- **Security** - Multiple security layers
- **Maintainability** - Clean code and documentation
