import swaggerJsdoc from 'swagger-jsdoc';
import { version } from '../../package.json';

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Analytics Engine API',
      version,
      description: 'Unified Event Analytics Engine for Web and Mobile Apps',
      contact: {
        name: 'Shafi Ahmed',
        email: 'your-email@example.com',
      },
    },
    servers: [
      {
        url: process.env.APP_URL || 'http://localhost:3000',
        description: 'Development server',
      },
    ],
    components: {
      securitySchemes: {
        ApiKeyAuth: {
          type: 'apiKey',
          in: 'header',
          name: 'X-API-Key',
          description: 'API key for event collection',
        },
        CookieAuth: {
          type: 'apiKey',
          in: 'cookie',
          name: 'connect.sid',
          description: 'Session cookie for authenticated endpoints',
        },
      },
      schemas: {
        Error: {
          type: 'object',
          properties: {
            success: {
              type: 'boolean',
              example: false,
            },
            message: {
              type: 'string',
              example: 'Error message',
            },
          },
        },
        ApiKey: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              format: 'uuid',
            },
            app_name: {
              type: 'string',
            },
            app_domain: {
              type: 'string',
            },
            api_key: {
              type: 'string',
            },
            is_active: {
              type: 'boolean',
            },
            expires_at: {
              type: 'string',
              format: 'date-time',
            },
            created_at: {
              type: 'string',
              format: 'date-time',
            },
            last_used_at: {
              type: 'string',
              format: 'date-time',
            },
          },
        },
        Event: {
          type: 'object',
          required: ['event'],
          properties: {
            event: {
              type: 'string',
              example: 'login_form_cta_click',
            },
            url: {
              type: 'string',
              example: 'https://example.com/page',
            },
            referrer: {
              type: 'string',
              example: 'https://google.com',
            },
            device: {
              type: 'string',
              enum: ['mobile', 'tablet', 'desktop'],
              example: 'mobile',
            },
            ipAddress: {
              type: 'string',
              example: '192.168.1.1',
            },
            timestamp: {
              type: 'string',
              format: 'date-time',
            },
            metadata: {
              type: 'object',
              properties: {
                browser: {
                  type: 'string',
                  example: 'Chrome',
                },
                os: {
                  type: 'string',
                  example: 'Android',
                },
                screenSize: {
                  type: 'string',
                  example: '1080x1920',
                },
              },
            },
            user_id: {
              type: 'string',
              example: 'user789',
            },
          },
        },
        EventSummary: {
          type: 'object',
          properties: {
            event: {
              type: 'string',
            },
            count: {
              type: 'integer',
            },
            uniqueUsers: {
              type: 'integer',
            },
            deviceData: {
              type: 'object',
              additionalProperties: {
                type: 'integer',
              },
            },
          },
        },
        UserStats: {
          type: 'object',
          properties: {
            userId: {
              type: 'string',
            },
            totalEvents: {
              type: 'integer',
            },
            deviceDetails: {
              type: 'object',
            },
            ipAddress: {
              type: 'string',
            },
          },
        },
      },
    },
    tags: [
      {
        name: 'Authentication',
        description: 'User authentication and API key management',
      },
      {
        name: 'Analytics',
        description: 'Event collection and analytics endpoints',
      },
    ],
  },
  apis: ['./dist/routes/*.js', './dist/app.js'],
};

export const swaggerSpec = swaggerJsdoc(options);
