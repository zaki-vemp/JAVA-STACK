import type { FullStackLayerNode } from '../types/curriculum';

export const FULL_STACK_LAYERS: FullStackLayerNode[] = [
  {
    id: 'fs-client',
    stepNumber: '01',
    layerName: 'Browser & TypeScript Client',
    technologies: ['React 19', 'TypeScript', 'TanStack Query', 'Idempotency-Key'],
    latencyBudget: '0–15 ms UI state',
    theoreticalRole: 'Maintains optimistic UI cache, validates user input locally, and attaches correlation/idempotency headers before network dispatch.',
    practicalResponsibilities: [
      'Send `Idempotency-Key: <uuid>` on every mutating POST checkout/payment action so retries never double-charge.',
      'Consume Cursor/Keyset pagination tokens (`nextCursor`) instead of page offsets for infinitely scrolling tables.',
      'Handle RFC 7807 `ProblemDetail` payloads (`status`, `detail`, `errors`) deterministically in typed fetch wrappers.',
    ],
    failureMode: 'Double-submitting forms on flaky mobile networks or storing JWTs in `localStorage` vulnerable to XSS.',
    interviewCheck: 'How do you synchronize optimistic React updates with Spring Boot optimistic locking (`@Version` 409 Conflict)?',
    codePreview: {
      label: 'TypeScript — Idempotent API Mutation',
      language: 'typescript',
      code: `export async function submitOrder(payload: OrderPayload, idempotencyKey: string) {
  const res = await fetch('/api/v1/orders', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Idempotency-Key': idempotencyKey,
    },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw (await res.json()) as ProblemDetail;
  return res.json();
}`,
    },
  },
  {
    id: 'fs-security',
    stepNumber: '02',
    layerName: 'Spring Security 6 Filter Chain',
    technologies: ['SecurityFilterChain', 'OncePerRequestFilter', 'JWT / OAuth2', 'CORS'],
    latencyBudget: '1–3 ms signature verify',
    theoreticalRole: 'Intercepts Servlet requests before `DispatcherServlet`, verifying cryptographic signatures and populating `SecurityContextHolder`.',
    practicalResponsibilities: [
      'Execute `CorsFilter` before authentication so browser `OPTIONS` preflight requests succeed cleanly.',
      'Enforce `SessionCreationPolicy.STATELESS` and validate JWT `iss`, `aud`, `exp`, and signing key rotation.',
      'Clear `SecurityContextHolder` after request completion and avoid double-registering servlet filters.',
    ],
    failureMode: 'Permitting preflight `OPTIONS` failure or returning 500 stack traces instead of 401/403.',
    interviewCheck: 'Why does `OncePerRequestFilter` run twice if annotated with `@Component` AND passed to `addFilterBefore`?',
    codePreview: {
      label: 'Java — Stateless Security Filter',
      language: 'java',
      code: `http.cors(Customizer.withDefaults())
    .csrf(AbstractHttpConfigurer::disable)
    .sessionManagement(s -> s.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
    .addFilterBefore(jwtFilter, UsernamePasswordAuthenticationFilter.class);`,
    },
  },
  {
    id: 'fs-controller',
    stepNumber: '03',
    layerName: 'Controller, Validation & RFC 7807',
    technologies: ['Spring MVC / WebFlux', 'Java Records / Kotlin DTOs', 'Bean Validation', 'ProblemDetail'],
    latencyBudget: '1–2 ms JSON serde',
    theoreticalRole: 'Deserializes HTTP payloads into immutable boundary DTOs, enforces schema constraints (`@Valid`), and maps domain exceptions to HTTP semantics.',
    practicalResponsibilities: [
      'Never expose JPA `@Entity` classes directly in `@RestController` signatures (prevents mass-assignment & lazy serialization bugs).',
      'Use `@RestControllerAdvice` extending `ResponseEntityExceptionHandler` to emit standardized RFC 7807 `ProblemDetail` JSON.',
      'Propagate `traceparent` / `X-Request-Id` into SLF4J MDC for end-to-end log correlation.',
    ],
    failureMode: 'Leaving `spring.jpa.open-in-view=true` enabled so Jackson triggers N+1 SQL queries while serializing JSON.',
    interviewCheck: 'Why should `spring.jpa.open-in-view` always be `false` in production APIs?',
    codePreview: {
      label: 'Java — RFC 7807 Controller Advice',
      language: 'java',
      code: `@RestControllerAdvice
public class ApiExceptionHandler {
    @ExceptionHandler(InsufficientFundsException.class)
    ProblemDetail handleInsufficientFunds(InsufficientFundsException ex) {
        ProblemDetail pd = ProblemDetail.forStatusAndDetail(HttpStatus.UNPROCESSABLE_ENTITY, ex.getMessage());
        pd.setTitle("Insufficient Funds");
        return pd;
    }
}`,
    },
  },
  {
    id: 'fs-service-tx',
    stepNumber: '04',
    layerName: 'Service Layer, CGLIB Proxies & Outbox',
    technologies: ['CGLIB Proxy', '@Transactional', 'TransactionTemplate', 'Resilience4j'],
    latencyBudget: '5–20 ms business + DB',
    theoreticalRole: 'Coordinates domain invariants, binds short-lived database transactions via `ThreadLocal`, and isolates downstream HTTP dependencies.',
    practicalResponsibilities: [
      'Perform slow external HTTP calls outside `@Transactional`; open transactions only for local PostgreSQL reads/writes.',
      'Write domain state + `outbox_events` inside the same local ACID transaction to eliminate Kafka dual-writes.',
      'Guard external dependencies with Resilience4j `@CircuitBreaker` + timeouts + jittered retries.',
    ],
    failureMode: 'Self-invocation (`this.saveAudit()`) silently bypassing `@Transactional(REQUIRES_NEW)` or checked exceptions committing unexpectedly.',
    interviewCheck: 'How does Spring AOP proxy behavior differ between Java and Kotlin (`all-open` compiler plugin)?',
    codePreview: {
      label: 'Kotlin — TransactionTemplate Scope',
      language: 'kotlin',
      code: `val authCode = paymentGateway.authorize(cmd.amount) // Outside DB tx!
txTemplate.execute {
    orderRepo.markPaid(cmd.orderId, authCode)
    outboxRepo.append("OrderPaid", cmd.orderId)
}`,
    },
  },
  {
    id: 'fs-pool',
    stepNumber: '05',
    layerName: 'HikariCP & Virtual Thread Scheduling',
    technologies: ['HikariCP', 'Java 21 Virtual Threads', 'PgBouncer', 'Micrometer'],
    latencyBudget: '<1 ms pool checkout',
    theoreticalRole: 'Multiplexes high-concurrency application threads onto a right-sized set of persistent TCP sockets to PostgreSQL.',
    practicalResponsibilities: [
      'Size HikariCP conservatively (`(cores * 2) + spindles`, typically 10–20 per service) and monitor `hikaricp.connections.pending`.',
      'Set `leakDetectionThreshold` in staging to catch unreleased connections.',
      'Ensure Java 21 virtual threads do not pin inside `synchronized` blocks during JDBC calls (prefer `ReentrantLock` or upgrade JDBC driver).',
    ],
    failureMode: 'Pool exhaustion caused by slow queries or nested `REQUIRES_NEW` holding two connections per request.',
    interviewCheck: 'Why does raising `maximumPoolSize` from 15 to 150 typically decrease PostgreSQL throughput?',
    codePreview: {
      label: 'YAML — HikariCP Production Tuning',
      language: 'yaml',
      code: `spring:
  threads.virtual.enabled: true
  jpa.open-in-view: false
  datasource.hikari:
    maximum-pool-size: 16
    connection-timeout: 3000
    leak-detection-threshold: 5000`,
    },
  },
  {
    id: 'fs-postgres',
    stepNumber: '06',
    layerName: 'PostgreSQL Engine, MVCC & Indexes',
    technologies: ['PostgreSQL 16', 'MVCC (xmin/xmax)', 'B-Tree / GIN / BRIN', 'Flyway + Testcontainers'],
    latencyBudget: '1–10 ms SQL execution',
    theoreticalRole: 'Executes relational queries against MVCC heap pages, guarantees ACID durability via WAL (`fsync`), and streams changes for CDC.',
    practicalResponsibilities: [
      'Use `CREATE INDEX CONCURRENTLY`, partial indexes, and `INCLUDE` covering columns verified via `EXPLAIN (ANALYZE, BUFFERS)`.',
      'Use `SELECT ... FOR UPDATE SKIP LOCKED` for horizontal job/outbox workers.',
      'Validate migrations and SQL behavior in CI using Testcontainers (`postgres:16-alpine`), never H2.',
    ],
    failureMode: 'Missing index causing Seq Scan at 1M rows, or `idle in transaction` sessions blocking Autovacuum.',
    interviewCheck: 'How do you investigate a query that runs in 2ms in staging but takes 4 seconds in production?',
    codePreview: {
      label: 'SQL — Keyset Seek + Index-Only Scan',
      language: 'sql',
      code: `CREATE INDEX CONCURRENTLY idx_orders_cursor
ON orders (created_at DESC, id DESC)
INCLUDE (total_cents, status);`,
    },
  },
];
