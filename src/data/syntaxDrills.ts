import { DifficultyLevel, TechTrack, type SyntaxDrill } from '../types/curriculum';

export const SYNTAX_DRILLS: SyntaxDrill[] = [
  {
    id: 'drill-spring-transactional',
    track: TechTrack.SpringBoot,
    mode: 'write',
    title: 'Spring @Transactional Propagation & Rollback Configuration',
    language: 'java',
    level: DifficultyLevel.Senior,
    prompt: 'Complete `recordAuditAttempt` so it runs in a brand-new independent transaction (`REQUIRES_NEW`) and rolls back on ALL exceptions including checked exceptions (`Exception.class`). Ensure the method is `public` so Spring CGLIB proxies can intercept it.',
    starterCode: `@Service
public class AuditLogService {
    private final AuditRepository auditRepo;

    public AuditLogService(AuditRepository auditRepo) {
        this.auditRepo = auditRepo;
    }

    // TODO: Add @Transactional with REQUIRES_NEW and rollbackFor = Exception.class
    void recordAuditAttempt(UUID orderId, String event) throws IOException {
        auditRepo.save(new AuditLog(orderId, event));
    }
}`,
    solutionCode: `@Service
public class AuditLogService {
    private final AuditRepository auditRepo;

    public AuditLogService(AuditRepository auditRepo) {
        this.auditRepo = auditRepo;
    }

    @Transactional(propagation = Propagation.REQUIRES_NEW, rollbackFor = Exception.class)
    public void recordAuditAttempt(UUID orderId, String event) throws IOException {
        auditRepo.save(new AuditLog(orderId, event));
    }
}`,
    explanation: 'Spring AOP proxies require non-private visibility to override/intercept methods, `Propagation.REQUIRES_NEW` suspends any outer transaction and acquires a separate connection, and `rollbackFor = Exception.class` prevents checked exceptions from silently committing.',
    checks: [
      {
        id: 'tx-annotation',
        description: 'Declares @Transactional annotation',
        pattern: '@Transactional\\s*\\(',
        required: true,
        errorHint: 'Add @Transactional(...) above the method.',
      },
      {
        id: 'tx-requires-new',
        description: 'Configures propagation = Propagation.REQUIRES_NEW',
        pattern: 'propagation\\s*=\\s*Propagation\\.REQUIRES_NEW',
        required: true,
        errorHint: 'Set propagation = Propagation.REQUIRES_NEW inside @Transactional.',
      },
      {
        id: 'tx-rollback-for',
        description: 'Configures rollbackFor = Exception.class',
        pattern: 'rollbackFor\\s*=\\s*(Exception\\.class|\\{\\s*Exception\\.class\\s*\\})',
        required: true,
        errorHint: 'Include rollbackFor = Exception.class so checked exceptions trigger rollback.',
      },
      {
        id: 'tx-public',
        description: 'Method is declared public (proxy interceptable)',
        pattern: 'public\\s+void\\s+recordAuditAttempt',
        required: true,
        errorHint: 'Make recordAuditAttempt `public` so Spring AOP proxies intercept it cleanly.',
      },
    ],
  },
  {
    id: 'drill-pg-skip-locked',
    track: TechTrack.PostgreSQL,
    mode: 'write',
    title: 'PostgreSQL Concurrent Worker Queue (FOR UPDATE SKIP LOCKED)',
    language: 'sql',
    level: DifficultyLevel.Senior,
    prompt: 'Write a PostgreSQL CTE query that safely claims up to 25 READY rows from `outbox_events` ordered by `created_at ASC`, skipping any rows locked by concurrent worker pods, and updates their status to `IN_PROGRESS` returning the claimed rows.',
    starterCode: `WITH claimed AS (
    SELECT id
    FROM outbox_events
    WHERE status = 'READY'
    -- TODO: Order by created_at ASC, limit 25, and lock without blocking sibling workers
)
UPDATE outbox_events o
SET status = 'IN_PROGRESS'
FROM claimed c
WHERE o.id = c.id
-- TODO: Return updated rows`,
    solutionCode: `WITH claimed AS (
    SELECT id
    FROM outbox_events
    WHERE status = 'READY'
    ORDER BY created_at ASC
    LIMIT 25
    FOR UPDATE SKIP LOCKED
)
UPDATE outbox_events o
SET status = 'IN_PROGRESS'
FROM claimed c
WHERE o.id = c.id
RETURNING o.*;`,
    explanation: '`FOR UPDATE SKIP LOCKED` prevents workers from waiting on row locks held by other pods, enabling lock-free horizontal scaling of outbox/job queues directly inside PostgreSQL.',
    checks: [
      {
        id: 'pg-order-limit',
        description: 'Orders by created_at ASC and limits batch size',
        pattern: 'ORDER\\s+BY\\s+created_at\\s+ASC[\\s\\S]*LIMIT\\s+25',
        flags: 'i',
        required: true,
        errorHint: 'Include `ORDER BY created_at ASC` and `LIMIT 25` inside the CTE.',
      },
      {
        id: 'pg-skip-locked',
        description: 'Uses FOR UPDATE SKIP LOCKED',
        pattern: 'FOR\\s+UPDATE\\s+SKIP\\s+LOCKED',
        flags: 'i',
        required: true,
        errorHint: 'Add `FOR UPDATE SKIP LOCKED` to skip rows locked by sibling workers.',
      },
      {
        id: 'pg-returning',
        description: 'Returns updated rows with RETURNING',
        pattern: 'RETURNING\\s+',
        flags: 'i',
        required: true,
        errorHint: 'Add `RETURNING o.*;` at the end of the UPDATE statement.',
      },
    ],
  },
  {
    id: 'drill-pg-gin-covering',
    track: TechTrack.PostgreSQL,
    mode: 'write',
    title: 'PostgreSQL Zero-Downtime Partial Covering Index',
    language: 'sql',
    level: DifficultyLevel.Senior,
    prompt: 'Write a production-safe DDL statement to create an index named `idx_orders_open_tenant` on `orders(tenant_id, created_at DESC)` without blocking table writes, covering `(total_cents)` for Index-Only Scans, and indexing ONLY rows where `status = \'OPEN\'`.',
    starterCode: `-- TODO: Create non-blocking partial covering index on orders`,
    solutionCode: `CREATE INDEX CONCURRENTLY idx_orders_open_tenant
ON orders (tenant_id, created_at DESC)
INCLUDE (total_cents)
WHERE status = 'OPEN';`,
    explanation: 'Combining `CONCURRENTLY` (no write lock), `INCLUDE (total_cents)` (Index-Only Scan payload), and `WHERE status = \'OPEN\'` (partial index) creates a compact, high-speed production index safely.',
    checks: [
      {
        id: 'idx-concurrently',
        description: 'Uses CREATE INDEX CONCURRENTLY to avoid SHARE write locks',
        pattern: 'CREATE\\s+INDEX\\s+CONCURRENTLY\\s+idx_orders_open_tenant',
        flags: 'i',
        required: true,
        errorHint: 'Use `CREATE INDEX CONCURRENTLY idx_orders_open_tenant` so production writes are not blocked.',
      },
      {
        id: 'idx-cols',
        description: 'Indexes (tenant_id, created_at DESC)',
        pattern: 'ON\\s+orders\\s*\\(\\s*tenant_id\\s*,\\s*created_at\\s+DESC\\s*\\)',
        flags: 'i',
        required: true,
        errorHint: 'Specify `ON orders (tenant_id, created_at DESC)`.',
      },
      {
        id: 'idx-include',
        description: 'Includes covering payload column total_cents',
        pattern: 'INCLUDE\\s*\\(\\s*total_cents\\s*\\)',
        flags: 'i',
        required: true,
        errorHint: 'Add `INCLUDE (total_cents)` for Index-Only Scans.',
      },
      {
        id: 'idx-partial',
        description: 'Filters partial index with WHERE status = \'OPEN\'',
        pattern: "WHERE\\s+status\\s*=\\s*'OPEN'",
        flags: 'i',
        required: true,
        errorHint: "Add partial predicate `WHERE status = 'OPEN'`.",
      },
    ],
  },
  {
    id: 'drill-java-virtual-threads',
    track: TechTrack.Java,
    mode: 'spot-bug',
    title: 'Spot the Bug: Java 21 Virtual Threads & Carrier Pinning',
    language: 'java',
    level: DifficultyLevel.Senior,
    prompt: 'This Java 21 service runs on Virtual Threads (`spring.threads.virtual.enabled=true`). Under peak load, throughput collapses even though CPU usage is 12%. Diagnose the primary root cause.',
    starterCode: `@Service
public class RateLimitSyncService {
    private final HttpClient httpClient = HttpClient.newHttpClient();

    public synchronized QuotaSnapshot fetchQuota(String tenantId) throws Exception {
        // Blocking network I/O inside synchronized monitor!
        HttpResponse<String> res = httpClient.send(buildRequest(tenantId), BodyHandlers.ofString());
        return parseSnapshot(res.body());
    }
}`,
    solutionCode: `@Service
public class RateLimitSyncService {
    private final HttpClient httpClient = HttpClient.newHttpClient();
    private final ReentrantLock lock = new ReentrantLock();

    public QuotaSnapshot fetchQuota(String tenantId) throws Exception {
        lock.lock();
        try {
            HttpResponse<String> res = httpClient.send(buildRequest(tenantId), BodyHandlers.ofString());
            return parseSnapshot(res.body());
        } finally {
            lock.unlock();
        }
    }
}`,
    explanation: 'In Java 21–23, executing blocking I/O inside a `synchronized` block pins the virtual thread to its OS carrier thread, starving the ForkJoinPool carrier pool. Switching to `ReentrantLock` allows clean unmounting.',
    checks: [],
    bugOptions: [
      {
        id: 'opt-httpclient',
        label: 'HttpClient.newHttpClient() is not thread-safe across virtual threads.',
        isCorrect: false,
        rationale: 'Incorrect. `java.net.http.HttpClient` is designed to be thread-safe and shared as a singleton.',
      },
      {
        id: 'opt-pinning',
        label: 'Blocking I/O inside `synchronized` pins the virtual thread to its OS carrier thread in Java 21.',
        isCorrect: true,
        rationale: 'Correct! In Java 21–23, `synchronized` prevents continuation unmounting during blocking `httpClient.send()`. Replacing `synchronized` with `ReentrantLock` frees the carrier thread.',
      },
      {
        id: 'opt-throws',
        label: 'Declaring `throws Exception` forces Spring to fall back to platform threads.',
        isCorrect: false,
        rationale: 'Incorrect. Method exception signatures have no effect on virtual thread scheduling.',
      },
    ],
  },
  {
    id: 'drill-kotlin-supervisor',
    track: TechTrack.Kotlin,
    mode: 'write',
    title: 'Kotlin Structured Concurrency: supervisorScope & Safe Cancellation',
    language: 'kotlin',
    level: DifficultyLevel.Senior,
    prompt: 'Refactor `loadDashboard` using `supervisorScope` and `async` so `fetchOrders` failure does NOT cancel `fetchProfile`, and make sure `CancellationException` is rethrown inside the fallback catch block.',
    starterCode: `suspend fun loadDashboard(userId: String): Dashboard =
    // TODO: Use supervisorScope instead of GlobalScope
    GlobalScope.async {
        val profile = async { profileApi.get(userId) }
        val orders = async {
            try {
                ordersApi.get(userId)
            } catch (e: Exception) {
                emptyList()
            }
        }
        Dashboard(profile.await(), orders.await())
    }.await()`,
    solutionCode: `suspend fun loadDashboard(userId: String): Dashboard = supervisorScope {
    val profile = async { profileApi.get(userId) }
    val orders = async {
        try {
            ordersApi.get(userId)
        } catch (e: CancellationException) {
            throw e
        } catch (e: Exception) {
            emptyList()
        }
    }
    Dashboard(profile.await(), orders.await())
}`,
    explanation: '`supervisorScope` preserves structured parent-child lifecycles while isolating child failures, and explicitly rethrowing `CancellationException` ensures coroutine cancellation is never accidentally swallowed.',
    checks: [
      {
        id: 'kt-supervisor',
        description: 'Uses supervisorScope instead of GlobalScope',
        pattern: 'supervisorScope\\s*\\{',
        required: true,
        errorHint: 'Wrap the parallel async calls in `supervisorScope { ... }`.',
      },
      {
        id: 'kt-no-global',
        description: 'Removes GlobalScope anti-pattern',
        pattern: 'GlobalScope',
        required: false,
        errorHint: 'Remove `GlobalScope`; it breaks structured concurrency and leaks coroutines.',
      },
      {
        id: 'kt-rethrow-cancel',
        description: 'Rethrows CancellationException explicitly',
        pattern: 'CancellationException',
        required: true,
        errorHint: 'Explicitly catch and rethrow `CancellationException` so parent cancellation propagates.',
      },
    ],
  },
  {
    id: 'drill-outbox-idempotency',
    track: TechTrack.SpringBoot,
    mode: 'spot-bug',
    title: 'Spot the Bug: Dual-Write Inconsistency in Order Checkout',
    language: 'java',
    level: DifficultyLevel.Staff,
    prompt: 'Review this checkout service. Occasionally customers are billed and saved in PostgreSQL, yet the fulfillment microservice never receives the Kafka event. What is the architectural bug?',
    starterCode: `@Service
public class CheckoutService {
    @Transactional
    public Order completeOrder(Cart cart) {
        Order saved = orderRepo.save(Order.from(cart));
        kafkaTemplate.send("orders.placed", saved.getId().toString(), saved);
        return saved;
    }
}`,
    solutionCode: `@Service
public class CheckoutService {
    @Transactional
    public Order completeOrder(Cart cart) {
        Order saved = orderRepo.save(Order.from(cart));
        outboxRepo.save(OutboxEvent.of("OrderPlaced", saved.getId(), toJson(saved)));
        return saved;
    }
}`,
    explanation: 'Publishing directly to Kafka inside `@Transactional` performs a dual-write across two independent systems (PostgreSQL + Kafka). If PostgreSQL rolls back after `kafkaTemplate.send()` succeeds, a phantom event is emitted; if the pod crashes after commit before Kafka acks, the event is lost.',
    checks: [],
    bugOptions: [
      {
        id: 'bug-order-return',
        label: 'Returning the JPA entity directly from @Transactional detaches it.',
        isCorrect: false,
        rationale: 'Returning an entity does not explain missing Kafka events.',
      },
      {
        id: 'bug-dual-write',
        label: 'Dual-write across Postgres and Kafka without Transactional Outbox causes lost or phantom events.',
        isCorrect: true,
        rationale: 'Correct! Persist an `outbox_events` row in the same ACID PostgreSQL transaction and relay it via Debezium CDC or a `SKIP LOCKED` worker.',
      },
      {
        id: 'bug-uuid-key',
        label: 'Using saved.getId().toString() as the Kafka partition key drops partitions.',
        isCorrect: false,
        rationale: 'Incorrect. String UUIDs are valid Kafka partition keys.',
      },
    ],
  },
  {
    id: 'drill-spring-security-chain',
    track: TechTrack.SpringBoot,
    mode: 'write',
    title: 'Spring Security 6 Stateless SecurityFilterChain',
    language: 'java',
    level: DifficultyLevel.Mid,
    prompt: 'Configure a Spring Security 6 `SecurityFilterChain` bean for a stateless REST API: disable CSRF, enforce `SessionCreationPolicy.STATELESS`, permit `/api/auth/**`, require authentication for all other requests, and insert `jwtFilter` before `UsernamePasswordAuthenticationFilter`.',
    starterCode: `@Bean
public SecurityFilterChain securityFilterChain(HttpSecurity http, JwtAuthFilter jwtFilter) throws Exception {
    return http
        // TODO: Configure stateless session, disable CSRF, permit /api/auth/**, addFilterBefore
        .build();
}`,
    solutionCode: `@Bean
public SecurityFilterChain securityFilterChain(HttpSecurity http, JwtAuthFilter jwtFilter) throws Exception {
    return http
        .csrf(AbstractHttpConfigurer::disable)
        .sessionManagement(sm -> sm.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
        .authorizeHttpRequests(auth -> auth
            .requestMatchers("/api/auth/**").permitAll()
            .anyRequest().authenticated()
        )
        .addFilterBefore(jwtFilter, UsernamePasswordAuthenticationFilter.class)
        .build();
}`,
    explanation: 'Spring Security 6 uses lambda DSL exclusively (`authorizeHttpRequests`, `sessionManagement`, `csrf`) and replaces `WebSecurityConfigurerAdapter`.',
    checks: [
      {
        id: 'sec-disable-csrf',
        description: 'Disables CSRF for stateless Bearer API',
        pattern: '\\.csrf\\s*\\(',
        required: true,
        errorHint: 'Configure `.csrf(AbstractHttpConfigurer::disable)` for a stateless token API.',
      },
      {
        id: 'sec-stateless',
        description: 'Sets SessionCreationPolicy.STATELESS',
        pattern: 'SessionCreationPolicy\\.STATELESS',
        required: true,
        errorHint: 'Configure `SessionCreationPolicy.STATELESS` inside `sessionManagement(...)`.',
      },
      {
        id: 'sec-auth-rules',
        description: 'Permits /api/auth/** and authenticates remaining requests',
        pattern: 'requestMatchers\\s*\\(\\s*"/api/auth/\\*\\*"\\s*\\)\\s*\\.permitAll\\(\\)',
        required: true,
        errorHint: 'Add `.requestMatchers("/api/auth/**").permitAll()`.',
      },
      {
        id: 'sec-filter-before',
        description: 'Registers jwtFilter before UsernamePasswordAuthenticationFilter',
        pattern: 'addFilterBefore\\s*\\(\\s*jwtFilter\\s*,\\s*UsernamePasswordAuthenticationFilter\\.class\\s*\\)',
        required: true,
        errorHint: 'Call `.addFilterBefore(jwtFilter, UsernamePasswordAuthenticationFilter.class)`.',
      },
    ],
  },
  {
    id: 'drill-java-sealed-switch',
    track: TechTrack.Java,
    mode: 'write',
    title: 'Java 21 Sealed Interface & Exhaustive Record Pattern Switch',
    language: 'java',
    level: DifficultyLevel.Mid,
    prompt: 'Define a `sealed interface PaymentStatus` permitting `Paid` and `Failed` records, then implement an exhaustive `switch` expression (without a `default` branch) using record deconstruction patterns.',
    starterCode: `public sealed interface PaymentStatus permits PaymentStatus.Paid, PaymentStatus.Failed {
    record Paid(String receiptId) implements PaymentStatus {}
    record Failed(String errorCode) implements PaymentStatus {}
}

public static String formatMessage(PaymentStatus status) {
    // TODO: Exhaustive switch with record pattern matching (no default branch)
}`,
    solutionCode: `public sealed interface PaymentStatus permits PaymentStatus.Paid, PaymentStatus.Failed {
    record Paid(String receiptId) implements PaymentStatus {}
    record Failed(String errorCode) implements PaymentStatus {}
}

public static String formatMessage(PaymentStatus status) {
    return switch (status) {
        case PaymentStatus.Paid(var receiptId) -> "Paid: " + receiptId;
        case PaymentStatus.Failed(var errorCode) -> "Failed: " + errorCode;
    };
}`,
    explanation: 'Sealed hierarchies let the Java 21 compiler prove exhaustiveness in `switch` expressions while deconstructing record components inline.',
    checks: [
      {
        id: 'java-switch-expr',
        description: 'Returns a switch expression over status',
        pattern: 'return\\s+switch\\s*\\(\\s*status\\s*\\)',
        required: true,
        errorHint: 'Use `return switch (status) { ... };`.',
      },
      {
        id: 'java-paid-pattern',
        description: 'Deconstructs PaymentStatus.Paid record pattern',
        pattern: 'case\\s+(PaymentStatus\\.)?Paid\\s*\\(',
        required: true,
        errorHint: 'Match `case PaymentStatus.Paid(var receiptId) -> ...`.',
      },
      {
        id: 'java-no-default',
        description: 'Omits redundant default branch to preserve compile-time exhaustiveness',
        pattern: '\\bdefault\\s*(:|->)',
        required: false,
        errorHint: 'Remove `default` so the compiler catches missing subtypes in the future.',
      },
    ],
  },
  {
    id: 'drill-kotlin-reified-extension',
    track: TechTrack.Kotlin,
    mode: 'write',
    title: 'Kotlin Inline + Reified Generic RestClient Extension',
    language: 'kotlin',
    level: DifficultyLevel.Mid,
    prompt: 'Write a Kotlin extension function `fetchTyped` on `RestClient` using `inline` and `reified T : Any` so callers can invoke `restClient.fetchTyped<UserDto>("/users/1")` without passing `UserDto::class.java`.',
    starterCode: `// TODO: Implement inline reified extension function fetchTyped on RestClient
fun <T : Any> RestClient.fetchTyped(uri: String): T {
    return this.get().uri(uri).retrieve().body(T::class.java)!!
}`,
    solutionCode: `inline fun <reified T : Any> RestClient.fetchTyped(uri: String): T =
    this.get()
        .uri(uri)
        .retrieve()
        .body(T::class.java)
        ?: throw IllegalStateException("Empty response from $uri")`,
    explanation: 'Normally JVM generics erase `T` at runtime, making `T::class.java` illegal. Marking the function `inline` and type parameter `reified` substitutes the concrete type at every call site.',
    checks: [
      {
        id: 'kt-inline',
        description: 'Declares function as inline',
        pattern: '\\binline\\s+fun\\b',
        required: true,
        errorHint: 'Add the `inline` modifier before `fun`.',
      },
      {
        id: 'kt-reified',
        description: 'Marks type parameter with reified',
        pattern: '<\\s*reified\\s+T\\b',
        required: true,
        errorHint: 'Add `reified` inside `<reified T : Any>`.',
      },
      {
        id: 'kt-class-java',
        description: 'Passes T::class.java to .body(...)',
        pattern: 'T::class\\.java',
        required: true,
        errorHint: 'Pass `T::class.java` to `.body(...)`.',
      },
    ],
  },
  {
    id: 'drill-fullstack-keyset-pagination',
    track: TechTrack.FullStack,
    mode: 'write',
    title: 'Full-Stack PostgreSQL Keyset (Cursor) Pagination Query',
    language: 'sql',
    level: DifficultyLevel.Senior,
    prompt: 'Replace slow `OFFSET` pagination with a PostgreSQL tuple-comparison Keyset Pagination query on `orders(id, total_cents, created_at)` fetching the next 20 rows strictly older than `(:cursorTs, :cursorId)` ordered by `created_at DESC, id DESC`.',
    starterCode: `SELECT id, total_cents, created_at
FROM orders
-- TODO: Replace OFFSET with tuple comparison WHERE (created_at, id) < (:cursorTs, :cursorId)
ORDER BY created_at DESC, id DESC
LIMIT 20 OFFSET 50000;`,
    solutionCode: `SELECT id, total_cents, created_at
FROM orders
WHERE (created_at, id) < (:cursorTs, :cursorId)
ORDER BY created_at DESC, id DESC
LIMIT 20;`,
    explanation: 'Row-value tuple comparisons `(created_at, id) < (:cursorTs, :cursorId)` leverage a composite B-Tree index `(created_at DESC, id DESC)` to seek in O(log N) time with deterministic tie-breaking on `id`.',
    checks: [
      {
        id: 'ks-tuple',
        description: 'Uses tuple comparison (created_at, id) < (:cursorTs, :cursorId)',
        pattern: 'WHERE\\s*\\(\\s*created_at\\s*,\\s*id\\s*\\)\\s*<\\s*\\(\\s*:cursorTs\\s*,\\s*:cursorId\\s*\\)',
        flags: 'i',
        required: true,
        errorHint: 'Add `WHERE (created_at, id) < (:cursorTs, :cursorId)`.',
      },
      {
        id: 'ks-no-offset',
        description: 'Eliminates slow OFFSET clause',
        pattern: '\\bOFFSET\\b',
        flags: 'i',
        required: false,
        errorHint: 'Remove `OFFSET`; cursor pagination replaces offset scanning.',
      },
      {
        id: 'ks-limit',
        description: 'Keeps LIMIT 20 page bound',
        pattern: 'LIMIT\\s+20',
        flags: 'i',
        required: true,
        errorHint: 'Keep `LIMIT 20`.',
      },
    ],
  },
];
