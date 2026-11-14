import { DifficultyLevel, TechTrack, type InterviewQuestion } from '../types/curriculum';

export const INTERVIEW_QUESTIONS: InterviewQuestion[] = [
  {
    id: 'q-spring-self-invocation',
    track: TechTrack.SpringBoot,
    level: DifficultyLevel.Senior,
    topicTag: 'Spring AOP & Proxies',
    prompt: 'Why does calling a @Transactional or @Async method from another method inside the same @Service class fail to start a new transaction or background thread?',
    whatTheyTest: 'Whether you actually understand Spring runtime proxy wrapping (CGLIB / JDK Dynamic Proxy) versus believing annotations magically rewrite method bodies.',
    theoreticalAnswer: 'Spring wraps target beans in a runtime proxy object (usually a CGLIB subclass when proxyTargetClass=true). External callers hold a reference to the proxy, so their calls pass through TransactionInterceptor or AsyncExecutionInterceptor. Inside the class, `this.innerMethod()` invokes the method directly on the raw target instance, completely bypassing the proxy wrapper.',
    practicalAnswer: 'Extract the inner method into a separate collaborator `@Service` bean and inject it via constructor injection, or use `TransactionTemplate` for explicit programmatic transaction boundaries. In self-contained async/tx flows, collaborator extraction keeps unit testing clean and preserves proxy interception.',
    codeSnippet: {
      label: 'Fix: Extract Collaborator Bean',
      language: 'java',
      code: `@Service
public class InvoiceFacade {
    private final AuditWorker auditWorker; // Injected Spring proxy
    public InvoiceFacade(AuditWorker auditWorker) { this.auditWorker = auditWorker; }

    public void process() {
        auditWorker.saveAuditIndependent(); // Traverses CGLIB proxy!
    }
}`,
    },
    followUps: [
      'Why does @Transactional also fail silently on `private` or `final` methods?',
      'What happens if an outer @Transactional catches a RuntimeException thrown by an inner Propagation.REQUIRED method?',
    ],
  },
  {
    id: 'q-spring-tx-propagation',
    track: TechTrack.SpringBoot,
    level: DifficultyLevel.Senior,
    topicTag: 'Transactions',
    prompt: 'Compare Propagation.REQUIRED, Propagation.REQUIRES_NEW, and Propagation.NESTED. When can REQUIRES_NEW deadlock your HikariCP pool?',
    whatTheyTest: 'Deep operational knowledge of JDBC connection binding in ThreadLocal and connection pool starvation under concurrency.',
    theoreticalAnswer: '`REQUIRED` (default) joins an existing ThreadLocal transaction or starts one if none exists. `REQUIRES_NEW` suspends the outer transaction, opens a brand-new physical JDBC connection, and commits/rolls back independently. `NESTED` reuses the SAME physical connection via JDBC Savepoints (`SAVEPOINT`), rolling back only to the savepoint without needing a second pool connection (note: JpaTransactionManager does not support NESTED with Hibernate out of the box).',
    practicalAnswer: 'If HikariCP has `maximumPoolSize = 10` and 10 concurrent requests each enter an outer `@Transactional` method (acquiring all 10 connections) and then call an inner `REQUIRES_NEW` method, all 10 threads block waiting for an 11th connection that can never be freed—causing a 30-second HikariCP pool deadlock.',
    followUps: [
      'Why does Spring commit checked exceptions by default, and how do you change it?',
      'Why should you never call an external REST API inside @Transactional?',
    ],
  },
  {
    id: 'q-pg-mvcc',
    track: TechTrack.PostgreSQL,
    level: DifficultyLevel.Senior,
    topicTag: 'MVCC & Vacuum',
    prompt: 'How does PostgreSQL implement MVCC internally, and why can a single long-running "idle in transaction" session bloat an entire high-churn table?',
    whatTheyTest: 'Understanding of PostgreSQL heap storage (`xmin`/`xmax` vs MySQL undo logs) and operational Autovacuum mechanics.',
    theoreticalAnswer: 'PostgreSQL stores multiple row versions directly inside heap pages using hidden `xmin` (creating XID) and `xmax` (deleting/updating XID) headers. An UPDATE writes a new tuple version and stamps `xmax` on the old version. Readers compare tuple XIDs against their transaction snapshot without acquiring row locks, while dead tuples remain on disk until VACUUM reclaims them.',
    practicalAnswer: 'VACUUM can only reclaim dead tuples whose `xmax` is older than the oldest active transaction snapshot across the entire cluster (the `xmin` horizon). An abandoned `idle in transaction` session pins that horizon, freezing dead-tuple cleanup for all tables—leading to massive heap bloat, sequential scan degradation, and eventually XID wraparound risk. Always enforce `idle_in_transaction_session_timeout`.',
    codeSnippet: {
      label: 'Operational Guardrail in postgresql.conf',
      language: 'sql',
      code: `ALTER SYSTEM SET idle_in_transaction_session_timeout = '30s';
ALTER SYSTEM SET statement_timeout = '15s';`,
    },
    followUps: [
      'What is a HOT (Heap-Only Tuple) update and how does table `fillfactor` enable it?',
      'What is the difference between VACUUM and VACUUM FULL?',
    ],
  },
  {
    id: 'q-pg-isolation',
    track: TechTrack.PostgreSQL,
    level: DifficultyLevel.Staff,
    topicTag: 'Isolation Levels',
    prompt: 'How does PostgreSQL REPEATABLE READ differ from the SQL standard, and what anomaly can still happen under REPEATABLE READ?',
    whatTheyTest: 'Whether you know PostgreSQL uses Snapshot Isolation (preventing Phantom Reads) and understand the Write Skew anomaly.',
    theoreticalAnswer: 'Per the SQL-92 standard, REPEATABLE READ allows Phantom Reads. In PostgreSQL, REPEATABLE READ is backed by Snapshot Isolation (SI): the transaction sees a frozen snapshot from its first query, so neither Non-Repeatable Reads nor Phantom Reads occur. However, SI does NOT prevent Write Skew, where two concurrent transactions read an overlapping set of rows and update disjoint rows based on that stale read.',
    practicalAnswer: 'To prevent Write Skew (e.g., two users simultaneously claiming the last remaining seat or on-call slot by updating separate rows), either escalate to `Isolation.SERIALIZABLE` (which uses Serializable Snapshot Isolation / SIRead locks and throws SQLSTATE 40001 on conflict—requiring a retry loop) or acquire explicit pessimistic locks (`SELECT ... FOR UPDATE`).',
    followUps: [
      'Does PostgreSQL allow Dirty Reads at READ UNCOMMITTED?',
      'How do you handle SQLSTATE 40001 serialization failures in Spring Boot?',
    ],
  },
  {
    id: 'q-pg-index-types',
    track: TechTrack.PostgreSQL,
    level: DifficultyLevel.Senior,
    topicTag: 'Indexing',
    prompt: 'When would you choose a GIN, BRIN, Partial, or Covering (`INCLUDE`) index over a standard B-Tree index in PostgreSQL?',
    whatTheyTest: 'Practical schema design trade-offs beyond "just add a B-Tree index".',
    theoreticalAnswer: 'B-Tree excels at equality, ranges, sorting, and prefix matching on scalar columns. GIN (Generalized Inverted Index) maps keys inside composite values like JSONB (`@>`), arrays, or `tsvector`. BRIN stores min/max values per physical block range (128 pages default), making it ~100x smaller than B-Tree when data correlates strongly with physical insertion order (e.g. append-only `created_at` event logs).',
    practicalAnswer: 'Use Partial Indexes (`WHERE status = \'PENDING\'`) when queries target a small active slice of a huge table. Use Covering Indexes (`INCLUDE (total_cents)`) so frequent read queries resolve purely via an Index-Only Scan without random heap page fetches.',
    followUps: [
      'Why does `CREATE INDEX` without `CONCURRENTLY` cause outages in production?',
      'How does column order `(tenant_id, created_at)` vs `(created_at, tenant_id)` affect range queries?',
    ],
  },
  {
    id: 'q-pg-explain-analyze',
    track: TechTrack.PostgreSQL,
    level: DifficultyLevel.Senior,
    topicTag: 'Query Tuning',
    prompt: 'What is the difference between EXPLAIN and EXPLAIN (ANALYZE, BUFFERS), and what red flags do you look for first?',
    whatTheyTest: 'Real debugging workflow when diagnosing slow production SQL queries.',
    theoreticalAnswer: '`EXPLAIN` only displays the planner’s estimated cost and row counts without executing the query. `EXPLAIN (ANALYZE, BUFFERS)` actually executes the statement (wrap DML in `BEGIN; ... ROLLBACK;`!), reporting real wall-clock timings per node, actual row counts, and shared buffer page hits vs disk reads.',
    practicalAnswer: 'Look for: (1) Large discrepancy between `estimated rows` and `actual rows` (fix with `ANALYZE table` or extended `CREATE STATISTICS`); (2) High `Rows Removed by Filter` inside an Index Scan (missing composite index column); (3) `Sort Method: external merge Disk` (`work_mem` too low); (4) `Heap Fetches` on an Index-Only Scan (table needs VACUUM).',
    followUps: [
      'Why might PostgreSQL pick a Sequential Scan even though an index exists on the column?',
      'What does `Bitmap Heap Scan` mean and when is it optimal?',
    ],
  },
  {
    id: 'q-java-virtual-threads',
    track: TechTrack.Java,
    level: DifficultyLevel.Senior,
    topicTag: 'Java 21 Concurrency',
    prompt: 'How do Java 21 Virtual Threads scale beyond platform threads, and what causes Carrier Thread Pinning?',
    whatTheyTest: 'Understanding M:N continuation scheduling, I/O vs CPU workloads, and the Java 21 `synchronized` pinning hazard.',
    theoreticalAnswer: 'Platform threads map 1:1 to ~1MB OS threads managed by the kernel. Virtual threads are lightweight JVM-managed continuations whose stacks live on the heap and are mounted onto a small ForkJoinPool of OS carrier threads. When a virtual thread hits blocking JDK I/O (sockets, JDBC), the JVM unmounts its stack chunk and frees the carrier thread.',
    practicalAnswer: 'Virtual threads only accelerate I/O-bound concurrency, not CPU-bound loops. In Java 21–23, entering a `synchronized` block or JNI call before performing blocking I/O pins the virtual thread to its OS carrier thread—replace `synchronized` with `ReentrantLock` (note: Java 24 JEP 491 fixes `synchronized` pinning). Also never pool virtual threads or abuse heavy `ThreadLocal` caches.',
    followUps: [
      'How do you enable virtual threads in Spring Boot 3.2+?',
      'How do you limit concurrency against a downstream database when using unbounded virtual threads?',
    ],
  },
  {
    id: 'q-java-jmm-volatile',
    track: TechTrack.Java,
    level: DifficultyLevel.Mid,
    topicTag: 'Java Memory Model',
    prompt: 'What does `volatile` actually guarantee in the Java Memory Model, and why is `volatile int count; count++` still not thread-safe?',
    whatTheyTest: 'Distinction between memory visibility/ordering (Happens-Before) and atomicity.',
    theoreticalAnswer: '`volatile` enforces two JMM guarantees: (1) Visibility—writes to a volatile field are flushed to main memory and reads invalidate stale CPU core caches; (2) Ordering—inserts memory barriers preventing compiler/CPU instruction reordering across the volatile read/write (establishing a Happens-Before edge).',
    practicalAnswer: '`count++` compiles to three separate bytecode steps: read, increment, write. Two threads can read the same value `5` simultaneously and both write `6`, losing an increment. Use `AtomicInteger`/`LongAdder` (CAS loop) or `ReentrantLock` for compound read-modify-write operations.',
    followUps: [
      'Why does `ConcurrentHashMap` outperform `Collections.synchronizedMap`?',
      'When would you prefer `LongAdder` over `AtomicLong`?',
    ],
  },
  {
    id: 'q-kotlin-structured-concurrency',
    track: TechTrack.Kotlin,
    level: DifficultyLevel.Senior,
    topicTag: 'Kotlin Coroutines',
    prompt: 'What is Structured Concurrency in Kotlin, and how do `coroutineScope` and `supervisorScope` behave differently when a child throws an exception?',
    whatTheyTest: 'Mastery of Kotlin Job hierarchies, cancellation propagation, and avoiding leaked background work.',
    theoreticalAnswer: 'Structured concurrency ties coroutine lifetimes to a lexical scope via a parent-child `Job` tree: a parent waits for all children, cancelling a parent cancels all children, and an uncaught child failure propagates upward.',
    practicalAnswer: 'In `coroutineScope`, if one child fails with an exception (other than `CancellationException`), the parent immediately cancels all sibling children and rethrows the exception. In `supervisorScope`, child failures do NOT cancel siblings or the parent—ideal for aggregating independent microservices where non-critical widgets can degrade gracefully. Never swallow `CancellationException` inside generic `catch (e: Exception)` blocks.',
    codeSnippet: {
      label: 'Safe Cancellation Rethrow',
      language: 'kotlin',
      code: `try {
    recommendationsClient.fetch(userId)
} catch (e: CancellationException) {
    throw e // Preserve structured cancellation!
} catch (e: Exception) {
    emptyList()
}`,
    },
    followUps: [
      'Why is `GlobalScope.launch` considered an anti-pattern in backend services?',
      'Which Dispatcher should wrap blocking JDBC calls in a Spring WebFlux Kotlin app?',
    ],
  },
  {
    id: 'q-kotlin-flow',
    track: TechTrack.Kotlin,
    level: DifficultyLevel.Mid,
    topicTag: 'Kotlin Flow',
    prompt: 'Explain the difference between Cold `Flow`, Hot `StateFlow`, and Hot `SharedFlow`.',
    whatTheyTest: 'Ability to pick the right reactive primitive for streaming data vs shared state vs one-shot events.',
    theoreticalAnswer: 'A Cold `Flow` is lazy—its producer block runs from scratch for each collector and stops when the collector cancels. `StateFlow` and `SharedFlow` are Hot streams that remain active independently of collectors and multicast emissions.',
    practicalAnswer: 'Use Cold `Flow` for database cursor streams or paginated API fetching. Use `StateFlow` (requires initial value, replays latest 1 value, conflates equal consecutive values) for live state caches or UI state. Use `SharedFlow` (configurable `replay` and `extraBufferCapacity`) for broadcast domain events where duplicate identical events must still be delivered.',
    followUps: [
      'How do `flowOn(Dispatchers.IO)` and `buffer()` affect upstream execution?',
    ],
  },
  {
    id: 'q-arch-outbox',
    track: TechTrack.SpringBoot,
    level: DifficultyLevel.Staff,
    topicTag: 'Distributed Systems',
    prompt: 'How do you reliably update PostgreSQL and publish an event to Kafka without distributed 2-Phase Commit (XA)?',
    whatTheyTest: 'Solving the Dual-Write problem in microservices using the Transactional Outbox Pattern and CDC.',
    theoreticalAnswer: 'Calling `repository.save()` and `kafkaTemplate.send()` sequentially is non-atomic: a crash or network blip between the two leaves PostgreSQL and Kafka permanently inconsistent. 2PC/XA introduces severe latency and availability coupling.',
    practicalAnswer: 'Use the Transactional Outbox Pattern: persist your domain row AND an `outbox_events` row inside the exact same local PostgreSQL ACID transaction. Then asynchronously relay rows from `outbox_events` to Kafka via either (a) Debezium tailing the PostgreSQL WAL (Change Data Capture) or (b) a polling worker using `SELECT ... FOR UPDATE SKIP LOCKED`. Because Outbox guarantees at-least-once delivery, consumers must enforce idempotency via a processed-event ID table.',
    followUps: [
      'How do you prevent outbox table bloat over months of traffic?',
      'Compare Saga Choreography vs Saga Orchestration for multi-service rollbacks.',
    ],
  },
  {
    id: 'q-arch-circuit-breaker',
    track: TechTrack.SpringBoot,
    level: DifficultyLevel.Senior,
    topicTag: 'Resilience4j',
    prompt: 'Walk through the three states of a Circuit Breaker and why combining `@Retry` without jitter can worsen an outage.',
    whatTheyTest: 'Resilience engineering fundamentals and cascading failure prevention.',
    theoreticalAnswer: 'A Circuit Breaker monitors a sliding window (count-based or time-based) of calls. In `CLOSED`, traffic flows normally. When failure or slow-call rate exceeds a threshold, it trips to `OPEN` and short-circuits calls immediately to a fallback for `waitDurationInOpenState`. After cooldown, it enters `HALF_OPEN`, allowing a small number of probe calls to decide whether to close or trip back open.',
    practicalAnswer: 'Naive retries against a degraded dependency multiply incoming load (3x traffic), creating a thundering herd that prevents recovery. Always configure exponential backoff with randomized jitter, strict timeouts, and put `@Retry` and `@CircuitBreaker` in the intentional AOP order with a meaningful fallback.',
    followUps: [
      'What is the Bulkhead pattern and how does it protect Tomcat/Jetty thread pools?',
    ],
  },
  {
    id: 'q-spring-security-flow',
    track: TechTrack.SpringBoot,
    level: DifficultyLevel.Mid,
    topicTag: 'Spring Security 6',
    prompt: 'Trace how an HTTP request with a JWT Bearer token passes through Spring Security 6 before reaching your `@RestController`.',
    whatTheyTest: 'Knowledge of Servlet Filter architecture, `SecurityFilterChain`, and `SecurityContextHolder`.',
    theoreticalAnswer: 'Requests hit the servlet container’s `DelegatingFilterProxy`, which delegates to Spring’s `FilterChainProxy` and the configured `SecurityFilterChain`—all before `DispatcherServlet`. Filters execute in strict order: CORS preflight, CSRF (disabled for stateless Bearer APIs), custom `OncePerRequestFilter` JWT validator (which parses/verifies signature and sets `SecurityContextHolder`), and `AuthorizationFilter` checking route/method rules.',
    practicalAnswer: 'Always ensure your JWT filter is NOT accidentally double-registered as both a `@Component` servlet filter and via `addFilterBefore`, and return clean HTTP 401 on invalid/expired tokens vs HTTP 403 on insufficient roles (`@PreAuthorize`).',
    followUps: [
      'When would you keep CSRF enabled even with JWT authentication?',
    ],
  },
  {
    id: 'q-java-records-sealed',
    track: TechTrack.Java,
    level: DifficultyLevel.Mid,
    topicTag: 'Java 21 Language',
    prompt: 'Why should you use Java `record` classes for API DTOs and Spring Data projections, but NOT for JPA `@Entity` classes?',
    whatTheyTest: 'Understanding of Java record immutability vs Hibernate proxy bytecode instrumentation.',
    theoreticalAnswer: 'Java `record` types are implicitly `final`, cannot extend classes, and have `final` fields initialized via a canonical constructor. JPA/Hibernate requires non-final classes with a no-arg constructor to generate lazy-loading proxy subclasses, and uses dirty checking by mutating entity fields.',
    practicalAnswer: 'Use `record` for immutable REST request/response DTOs, Spring `@ConfigurationProperties`, and fast read-only Spring Data JPA constructor projections (`List<OrderSummaryRecord> findByTenantId(...)`), while keeping `@Entity` as regular classes.',
    followUps: [
      'How do `sealed` interfaces enable exhaustive `switch` expressions without a `default` branch?',
    ],
  },
  {
    id: 'q-kotlin-jpa-dataclass',
    track: TechTrack.Kotlin,
    level: DifficultyLevel.Senior,
    topicTag: 'Kotlin + JPA',
    prompt: 'What breaks when you annotate a Kotlin `data class` as a JPA `@Entity`?',
    whatTheyTest: 'Subtle Kotlin + Hibernate pitfalls that cause production bugs and N+1 queries.',
    theoreticalAnswer: 'A `data class` auto-generates `equals()`, `hashCode()`, `toString()`, and `copy()` using every property in the primary constructor, and compiles as a `final` class.',
    practicalAnswer: 'Three things break: (1) If the DB assigns `@GeneratedValue` ID on `persist()`, `hashCode()` changes after insertion into a `HashSet`; (2) `toString()` accesses lazy `@OneToMany` collections, triggering `LazyInitializationException` or N+1 queries during logging; (3) `final` breaks Hibernate lazy proxies unless the `kotlin-jpa` / `all-open` plugin is configured. Use a regular `class` with ID-based `equals` and constant `javaClass.hashCode()`.',
    followUps: [
      'What do the `kotlin-spring` and `kotlin-jpa` compiler plugins actually generate?',
    ],
  },
  {
    id: 'q-fullstack-n-plus-one',
    track: TechTrack.FullStack,
    level: DifficultyLevel.Senior,
    topicTag: 'JPA & API Performance',
    prompt: 'How do you detect and fix the JPA N+1 query problem when paginating parent entities that have child collections?',
    whatTheyTest: 'Fixing N+1 without falling into the Hibernate `HHH90003004` in-memory pagination trap.',
    theoreticalAnswer: 'N+1 happens when fetching N parent rows triggers N extra lazy `SELECT` queries while serializing child relationships. Setting `spring.jpa.open-in-view=false` forces lazy access outside the service transaction to fail fast during testing instead of silently leaking queries in production.',
    practicalAnswer: 'If you blindly add `JOIN FETCH` to a paginated `Pageable` query, Hibernate cannot apply SQL `LIMIT` across joined duplicate parent rows, so it loads the ENTIRE table into JVM heap and paginates in memory! Instead, use a two-step fetch: (1) fetch `Page<UUID>` of parent IDs with SQL `LIMIT/OFFSET`; (2) run `JOIN FETCH` with `WHERE o.id IN :ids` (or configure `@BatchSize(size = 50)`).',
    followUps: [
      'Why should `spring.jpa.open-in-view` be set to `false` in production APIs?',
    ],
  },
  {
    id: 'q-fullstack-hikaricp',
    track: TechTrack.FullStack,
    level: DifficultyLevel.Senior,
    topicTag: 'Pool Sizing & Pagination',
    prompt: 'Why does increasing HikariCP `maximumPoolSize` to 200 often make a PostgreSQL-backed Spring Boot API SLOWER, and why does Keyset Pagination beat `OFFSET`?',
    whatTheyTest: 'Systems-level database concurrency intuition and full-stack pagination scalability.',
    theoreticalAnswer: 'PostgreSQL spawns a dedicated OS backend process per connection. Having 200 active queries on an 8-core DB causes severe CPU context-switching, L1/L2 cache thrashing, and LWLock contention. HikariCP’s optimal formula is `(core_count * 2) + effective_spindle_count` (often 10–20 active connections, scaled across microservices with PgBouncer).',
    practicalAnswer: 'Similarly, `OFFSET 100000 LIMIT 20` forces Postgres to read and discard 100,000 tuples on every page turn—O(N) cost. Keyset (Cursor) Pagination (`WHERE (created_at, id) < (:ts, :id) ORDER BY created_at DESC, id DESC LIMIT 20`) uses a B-Tree seek to jump directly to the cursor in O(log N) constant time, and pairs cleanly with React infinite-scroll / TanStack Query `useInfiniteQuery`.',
    followUps: [
      'How do you handle sorting by a non-unique column like `price` in keyset pagination?',
      'Why are Testcontainers with PostgreSQL preferable to H2 in CI pipelines?',
    ],
  },
];
