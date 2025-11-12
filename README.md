# Analytics Engine - Unified Event Analytics for Web and Mobile Apps

A scalable, production-ready backend API for collecting and analyzing website and mobile app analytics. Built with Node.js, TypeScript, PostgreSQL, and Redis.

## Live Demo

**Deployment URL:** [https://analyticsengine-production.up.railway.app](https://analyticsengine-production.up.railway.app)

**API Documentation:** [https://analyticsengine-production.up.railway.app/api-docs](https://analyticsengine-production.up.railway.app/api-docs)

## Features

- **Google OAuth Authentication** - Secure user onboarding
- **API Key Management** - Create, revoke, and regenerate API keys
- **High-Volume Event Collection** - Handles millions of analytics events
- **Real-time Analytics** - Event summaries and user statistics
- **Redis Caching** - Optimized query performance
- **Rate Limiting** - Protection against abuse
- **Comprehensive API Documentation** - Interactive Swagger UI
- **Docker Support** - Easy deployment and scaling
- **Database Optimization** - Indexed queries for fast aggregations

## Tech Stack

- **Runtime:** Node.js 18+
- **Language:** TypeScript
- **Framework:** Express.js
- **Database:** PostgreSQL 15
- **Cache:** Redis 7
- **Authentication:** Passport.js (Google OAuth 2.0)
- **Validation:** Joi
- **Documentation:** Swagger/OpenAPI
- **Testing:** Jest, Supertest
- **Containerization:** Docker & Docker Compose

## Architecture

```
┌─────────────┐      ┌──────────────┐      ┌─────────────┐
│   Client    │─────▶│  Express API  │─────▶│ PostgreSQL  │
│ (Web/Mobile)│      │   + Redis     │      │  Database   │
└─────────────┘      └──────────────┘      └─────────────┘
      │                      │
      │                      ▼
      │              ┌──────────────┐
      └─────────────▶│ Google OAuth │
                     └──────────────┘
```

## Quick Start

### Prerequisites

- Node.js 18+ and npm
- PostgreSQL 15+
- Redis 7+
- Google OAuth credentials

### Installation

1. **Clone the repository**
```bash
git clone <your-repo-url>
cd the_alter_office
```

2. **Install dependencies**
```bash
npm install
```

3. **Set up environment variables**
```bash
cp .env.example .env
```

Edit `.env` and add your credentials:
```env
# Database
DATABASE_URL=postgresql://user:password@localhost:5432/analytics_db

# Redis
REDIS_URL=redis://localhost:6379

# Google OAuth
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
GOOGLE_CALLBACK_URL=http://localhost:3000/api/auth/google/callback

# Session
SESSION_SECRET=your_random_secret_key
```

4. **Set up the database**
```bash
# Create database
createdb analytics_db

# Run migrations
psql -d analytics_db -f src/database/schema.sql
```

5. **Start the development server**
```bash
npm run dev
```

The API will be available at `http://localhost:3000`

## Docker Deployment

### Using Docker Compose (Recommended)

```bash
# Build and start all services
docker-compose up -d

# View logs
docker-compose logs -f

# Stop services
docker-compose down
```

This will start:
- API server on port 3000
- PostgreSQL on port 5432
- Redis on port 6379

### Using Docker Only

```bash
# Build image
docker build -t analytics-engine .

# Run container
docker run -p 3000:3000 \
  -e DATABASE_URL=your_database_url \
  -e REDIS_URL=your_redis_url \
  -e GOOGLE_CLIENT_ID=your_client_id \
  -e GOOGLE_CLIENT_SECRET=your_client_secret \
  analytics-engine
```

## API Endpoints

### Authentication

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| GET | `/api/auth/google` | Initiate Google OAuth | No |
| GET | `/api/auth/google/callback` | OAuth callback | No |
| GET | `/api/auth/me` | Get current user | Yes (Session) |
| POST | `/api/auth/logout` | Logout user | Yes (Session) |
| POST | `/api/auth/register` | Register app and get API key | Yes (Session) |
| GET | `/api/auth/api-keys` | List all API keys | Yes (Session) |
| GET | `/api/auth/api-keys/:id` | Get specific API key | Yes (Session) |
| POST | `/api/auth/api-keys/:id/revoke` | Revoke API key | Yes (Session) |
| POST | `/api/auth/api-keys/:id/regenerate` | Regenerate API key | Yes (Session) |

### Analytics

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| POST | `/api/analytics/collect` | Collect analytics event | Yes (API Key) |
| GET | `/api/analytics/event-summary` | Get event aggregations | Yes (Session) |
| GET | `/api/analytics/user-stats` | Get user statistics | Yes (Session) |
| GET | `/api/analytics/dashboard` | Get dashboard overview | Yes (Session) |

## Usage Examples

### 1. Register and Get API Key

First, authenticate with Google OAuth:
```
GET http://localhost:3000/api/auth/google
```

Then register your app:
```bash
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -H "Cookie: connect.sid=your_session_cookie" \
  -d '{
    "app_name": "My Awesome App",
    "app_domain": "https://myapp.com"
  }'
```

Response:
```json
{
  "success": true,
  "message": "API key generated successfully",
  "data": {
    "id": "uuid",
    "app_name": "My Awesome App",
    "api_key": "your_api_key_here",
    "expires_at": "2025-11-12T00:00:00.000Z"
  }
}
```

### 2. Collect Analytics Event

```bash
curl -X POST http://localhost:3000/api/analytics/collect \
  -H "Content-Type: application/json" \
  -H "X-API-Key: your_api_key_here" \
  -d '{
    "event": "login_form_cta_click",
    "url": "https://myapp.com/login",
    "referrer": "https://google.com",
    "device": "mobile",
    "user_id": "user123",
    "metadata": {
      "browser": "Chrome",
      "os": "Android",
      "screenSize": "1080x1920"
    }
  }'
```

### 3. Get Event Summary

```bash
curl -X GET "http://localhost:3000/api/analytics/event-summary?event=login_form_cta_click&startDate=2024-01-01&endDate=2024-12-31" \
  -H "Cookie: connect.sid=your_session_cookie"
```

Response:
```json
{
  "success": true,
  "data": {
    "event": "login_form_cta_click",
    "count": 3400,
    "uniqueUsers": 1200,
    "deviceData": {
      "mobile": 2200,
      "desktop": 1200
    }
  }
}
```

### 4. Get User Statistics

```bash
curl -X GET "http://localhost:3000/api/analytics/user-stats?userId=user123" \
  -H "Cookie: connect.sid=your_session_cookie"
```

## Database Schema

The application uses a well-optimized PostgreSQL schema:

- **users** - Stores authenticated users
- **api_keys** - Manages API keys for applications
- **events** - Stores all analytics events (with indexes for fast queries)

Key optimizations:
- Composite indexes on frequently queried columns
- GIN index for JSONB metadata queries
- Materialized views for heavy aggregations
- Foreign key constraints for data integrity

## Testing

```bash
# Run all tests
npm test

# Run tests with coverage
npm run test:coverage

# Watch mode
npm run test:watch
```

## Performance Optimizations

1. **Database Indexing** - Strategic indexes on high-query columns
2. **Redis Caching** - Frequently accessed data cached with TTL
3. **Connection Pooling** - Efficient database connection management
4. **Rate Limiting** - Prevents API abuse
5. **Materialized Views** - Pre-computed aggregations for complex queries
6. **Query Optimization** - Efficient SQL queries with proper joins

## Security Features

- Helmet.js for HTTP header security
- Rate limiting on all endpoints
- API key authentication with expiration
- Session-based authentication with secure cookies
- Input validation using Joi
- SQL injection prevention via parameterized queries
- CORS configuration
- Environment variable protection

## Challenges Faced and Solutions

### Challenge 1: High-Volume Event Ingestion
**Problem:** Need to handle thousands of events per second without performance degradation.

**Solution:**
- Implemented connection pooling for database
- Added Redis caching layer
- Used indexed columns for fast writes
- Optimized database schema with composite indexes

### Challenge 2: Complex Aggregation Queries
**Problem:** Event summary queries were slow with millions of records.

**Solution:**
- Created materialized views for pre-computed aggregations
- Implemented Redis caching with smart invalidation
- Used efficient SQL with proper joins and group by clauses
- Added query optimization with parameterized inputs

### Challenge 3: Authentication Flow
**Problem:** Balancing security with ease of integration.

**Solution:**
- Google OAuth for user authentication (secure and convenient)
- API key system for programmatic access
- Separate auth mechanisms for different use cases
- Session management with secure cookies

### Challenge 4: Scalability
**Problem:** System needs to scale horizontally for growth.

**Solution:**
- Stateless API design
- Docker containerization
- Redis for distributed caching
- Database connection pooling
- Prepared for load balancing

## Future Enhancements

- [ ] Webhook notifications for real-time alerts
- [ ] Advanced filtering and segmentation
- [ ] Custom dashboard builder
- [ ] Export to CSV/PDF
- [ ] Real-time WebSocket streaming
- [ ] Machine learning for anomaly detection
- [ ] Multi-tenancy support
- [ ] GraphQL API
- [ ] Mobile SDKs (iOS/Android)
- [ ] JavaScript tracking library

## Deployment

### Deploy to Render

1. Create a new Web Service on [Render](https://render.com)
2. Connect your GitHub repository
3. Configure build settings:
   - **Build Command:** `npm install && npm run build`
   - **Start Command:** `npm start`
4. Add environment variables from `.env.example`
5. Create PostgreSQL and Redis instances
6. Deploy!

### Deploy to Railway

1. Install Railway CLI: `npm install -g @railway/cli`
2. Login: `railway login`
3. Initialize: `railway init`
4. Add PostgreSQL: `railway add postgresql`
5. Add Redis: `railway add redis`
6. Deploy: `railway up`

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

MIT License - feel free to use this project for your own purposes.

## Author

**Shafi Ahmed**
- Email: shfahmd001@gmail.com
- GitHub: [@ita004](https://github.com/ita004)
- LinkedIn: [Shafi Ahmed](https://www.linkedin.com/in/shafi-ah01/)

## Acknowledgments

Built as part of The Alter Office backend engineer assessment. Special thanks to the team for providing clear requirements and the opportunity to work on this interesting problem.

---

**Note:** This is a production-ready application with enterprise-grade code quality, comprehensive testing, and scalability in mind. The architecture supports millions of events and can be horizontally scaled to meet growing demands.
