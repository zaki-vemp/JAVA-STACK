import type { SpringBootChapter, SpringBootFileNode } from '../types/curriculum';

export interface SpringAnnotationReference {
  annotation: string;
  stereotypeOrLayer: string;
  runtimeBehavior: string;
  interviewRule: string;
}

export const SPRING_BOOT_ANNOTATIONS: SpringAnnotationReference[] = [
  {
    annotation: '@SpringBootApplication',
    stereotypeOrLayer: 'Entry Point',
    runtimeBehavior:
      'Combines @SpringBootConfiguration, @EnableAutoConfiguration, and @ComponentScan to bootstrap the IoC container and load AutoConfiguration.imports.',
    interviewRule:
      'Place at the root package (e.g. com.acme.orders) so component scanning automatically discovers all child feature packages.',
  },
  {
    annotation: '@RestController',
    stereotypeOrLayer: 'Web / API Layer',
    runtimeBehavior:
      'Combines @Controller + @ResponseBody; DispatcherServlet serializes return values directly to JSON via Jackson HttpMessageConverter.',
    interviewRule:
      'Never inject Repositories directly into Controllers or expose JPA @Entity classes in HTTP payloads.',
  },
  {
    annotation: '@Service',
    stereotypeOrLayer: 'Use-Case / Transaction Boundary',
    runtimeBehavior:
      'Marks business orchestration beans eligible for Spring AOP proxies (@Transactional, @Async, @Retryable).',
    interviewRule:
      'Keep @Transactional boundaries here, use constructor injection with final fields, and never hold DB transactions open across external HTTP calls.',
  },
  {
    annotation: '@Repository',
    stereotypeOrLayer: 'Persistence Layer',
    runtimeBehavior:
      'Registers data access beans and activates PersistenceExceptionTranslationPostProcessor to translate vendor SQL errors into Spring DataAccessException.',
    interviewRule:
      'Spring Data JPA interfaces (extending JpaRepository) are proxied automatically at runtime by SimpleJpaRepository.',
  },
  {
    annotation: '@Configuration + @Bean',
    stereotypeOrLayer: 'Explicit Wiring & Third-Party SDKs',
    runtimeBehavior:
      'proxyBeanMethods = true wraps @Configuration in CGLIB so inter-bean calls return the singleton instance from the ApplicationContext.',
    interviewRule:
      'Use @Bean for third-party libraries (RestClient, ObjectMapper, Clock, MeterRegistry) that you cannot annotate with @Component.',
  },
  {
    annotation: '@ConfigurationProperties',
    stereotypeOrLayer: 'Type-Safe Config Binding',
    runtimeBehavior:
      'Binds hierarchical application.yml keys cleanly onto immutable Java records or POJOs with JSR-380 Bean Validation at startup.',
    interviewRule:
      'Prefer @ConfigurationProperties + @Validated over scattered @Value("${...}") fields so misconfigured prod apps fail fast on boot.',
  },
];

export const SPRING_BOOT_PROJECT_TREE: SpringBootFileNode[] = [
  {
    id: 'file-app',
    path: 'src/main/java/com/acme/orders/OrdersApplication.java',
    layer: 'Bootstrap',
    roleSummary: 'Root entry point anchoring component scanning and configuration properties.',
    keyAnnotations: ['@SpringBootApplication', '@ConfigurationPropertiesScan'],
    architecturalRule:
      'Always keep this class in the top-level root package so @ComponentScan covers every feature subpackage without manual basePackages.',
    language: 'java',
    code: `package com.acme.orders;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.context.properties.ConfigurationPropertiesScan;

@SpringBootApplication
@ConfigurationPropertiesScan
public class OrdersApplication {
    public static void main(String[] args) {
        SpringApplication.run(OrdersApplication.class, args);
    }
}`,
  },
  {
    id: 'file-yaml',
    path: 'src/main/resources/application.yml',
    layer: 'Config',
    roleSummary: 'Production-hardened runtime defaults: Virtual Threads, OSIV disabled, HikariCP, graceful shutdown, and Actuator probes.',
    keyAnnotations: ['spring.jpa.open-in-view: false', 'spring.threads.virtual.enabled: true'],
    architecturalRule:
      'Always disable open-in-view in production APIs so lazy JPA loading cannot silently fire queries during JSON serialization outside @Transactional.',
    language: 'yaml',
    code: `spring:
  application:
    name: orders-service
  threads:
    virtual:
      enabled: true # Java 21 M:N virtual threads for Tomcat & @Async
  datasource:
    url: \${DB_URL:jdbc:postgresql://localhost:5432/orders}
    hikari:
      maximum-pool-size: 20
      connection-timeout: 3000
      leak-detection-threshold: 10000
  jpa:
    open-in-view: false # Mandatory: prevent N+1 queries in Jackson serialization
    hibernate:
      ddl-auto: validate # Schema owned strictly by Flyway migrations

server:
  shutdown: graceful

management:
  endpoints:
    web:
      exposure:
        include: health,info,prometheus
  endpoint:
    health:
      probes:
        enabled: true`,
  },
  {
    id: 'file-controller',
    path: 'src/main/java/com/acme/orders/order/OrderController.java',
    layer: 'Web / API',
    roleSummary: 'Thin HTTP adapter: validates input DTOs, delegates to the Service, and maps domain results to HTTP status codes.',
    keyAnnotations: ['@RestController', '@RequestMapping', '@Valid'],
    architecturalRule:
      'Controllers handle HTTP concerns only (routing, status codes, @Valid payloads). Business rules and transactions belong strictly in the Service layer.',
    language: 'java',
    code: `package com.acme.orders.order;

import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.net.URI;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/orders")
public class OrderController {

    private final OrderService orderService;

    public OrderController(OrderService orderService) {
        this.orderService = orderService;
    }

    @PostMapping
    public ResponseEntity<OrderResponse> create(@Valid @RequestBody CreateOrderRequest request) {
        OrderResponse created = orderService.placeOrder(request);
        URI location = URI.create("/api/v1/orders/" + created.orderId());
        return ResponseEntity.created(location).body(created);
    }

    @GetMapping("/{orderId}")
    public ResponseEntity<OrderSummaryProjection> getById(@PathVariable UUID orderId) {
        return ResponseEntity.ok(orderService.getOrderSummary(orderId));
    }
}`,
  },
  {
    id: 'file-service',
    path: 'src/main/java/com/acme/orders/order/OrderService.java',
    layer: 'Domain / Service',
    roleSummary: 'Transactional orchestration boundary owning invariants, state transitions, and read-only query optimization.',
    keyAnnotations: ['@Service', '@Transactional(rollbackFor = Exception.class)', '@Transactional(readOnly = true)'],
    architecturalRule:
      'Use @Transactional(readOnly = true) on query methods to skip Hibernate dirty-checking snapshots and keep write transactions narrow.',
    language: 'java',
    code: `package com.acme.orders.order;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.util.UUID;

@Service
public class OrderService {

    private final OrderRepository orderRepository;
    private final OutboxWriter outboxWriter;

    public OrderService(OrderRepository orderRepository, OutboxWriter outboxWriter) {
        this.orderRepository = orderRepository;
        this.outboxWriter = outboxWriter;
    }

    @Transactional(rollbackFor = Exception.class)
    public OrderResponse placeOrder(CreateOrderRequest request) {
        OrderEntity entity = OrderEntity.createPending(
                request.customerId(),
                request.totalCents(),
                request.currency()
        );
        OrderEntity saved = orderRepository.save(entity);
        // Same DB transaction -> guarantees atomic state + domain event persistence
        outboxWriter.recordOrderCreated(saved);
        return OrderResponse.from(saved);
    }

    @Transactional(readOnly = true)
    public OrderSummaryProjection getOrderSummary(UUID orderId) {
        return orderRepository.findSummaryById(orderId)
                .orElseThrow(() -> new OrderNotFoundException(orderId));
    }
}`,
  },
  {
    id: 'file-repo',
    path: 'src/main/java/com/acme/orders/order/OrderRepository.java',
    layer: 'Persistence',
    roleSummary: 'Spring Data JPA repository combining derived queries, DTO interface projections, and @EntityGraph eager fetches.',
    keyAnnotations: ['@EntityGraph', '@Query'],
    architecturalRule:
      'Use DTO/interface projections for read endpoints instead of loading full @Entity graphs when you do not intend to mutate rows.',
    language: 'java',
    code: `package com.acme.orders.order;

import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import java.util.Optional;
import java.util.UUID;

public interface OrderRepository extends JpaRepository<OrderEntity, UUID> {

    @Query("""
        select o.id as orderId, o.status as status, o.totalCents as totalCents
        from OrderEntity o
        where o.id = :orderId
    """)
    Optional<OrderSummaryProjection> findSummaryById(UUID orderId);

    @EntityGraph(attributePaths = {"lineItems"})
    Optional<OrderEntity> findWithItemsById(UUID orderId);
}`,
  },
  {
    id: 'file-entity',
    path: 'src/main/java/com/acme/orders/order/OrderEntity.java',
    layer: 'Persistence',
    roleSummary: 'Encapsulated JPA entity using optimistic locking (@Version), factory creation, and safe equality.',
    keyAnnotations: ['@Entity', '@Table', '@Version'],
    architecturalRule:
      'Avoid public setters on status/money fields and never generate Lombok @Data/@EqualsAndHashCode(callSuper=false) across lazy associations.',
    language: 'java',
    code: `package com.acme.orders.order;

import jakarta.persistence.*;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "orders")
public class OrderEntity {

    @Id
    private UUID id;

    @Column(nullable = false)
    private UUID customerId;

    @Column(nullable = false)
    private long totalCents;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private OrderStatus status;

    @Version
    private long version; // Prevents lost updates under concurrent writes

    private Instant createdAt;

    protected OrderEntity() {}

    public static OrderEntity createPending(UUID customerId, long totalCents, String currency) {
        if (totalCents <= 0) throw new IllegalArgumentException("Order total must be positive");
        OrderEntity order = new OrderEntity();
        order.id = UUID.randomUUID();
        order.customerId = customerId;
        order.totalCents = totalCents;
        order.status = OrderStatus.PENDING;
        order.createdAt = Instant.now();
        return order;
    }

    public UUID getId() { return id; }
    public OrderStatus getStatus() { return status; }
    public long getTotalCents() { return totalCents; }
}`,
  },
  {
    id: 'file-advice',
    path: 'src/main/java/com/acme/orders/shared/GlobalExceptionHandler.java',
    layer: 'Cross-Cutting',
    roleSummary: 'Centralized exception translation producing standardized RFC 9457 / 7807 ProblemDetail JSON responses.',
    keyAnnotations: ['@RestControllerAdvice', '@ExceptionHandler'],
    architecturalRule:
      'Map domain and validation exceptions deterministically to ProblemDetail without exposing stack traces or internal SQL details.',
    language: 'java',
    code: `package com.acme.orders.shared;

import org.springframework.http.HttpStatus;
import org.springframework.http.ProblemDetail;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import java.net.URI;

@RestControllerAdvice
public class GlobalExceptionHandler {

    @ExceptionHandler(OrderNotFoundException.class)
    public ProblemDetail handleNotFound(OrderNotFoundException ex) {
        ProblemDetail problem = ProblemDetail.forStatusAndDetail(HttpStatus.NOT_FOUND, ex.getMessage());
        problem.setTitle("Order Not Found");
        problem.setType(URI.create("https://api.acme.com/errors/order-not-found"));
        return problem;
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ProblemDetail handleValidation(MethodArgumentNotValidException ex) {
        ProblemDetail problem = ProblemDetail.forStatus(HttpStatus.BAD_REQUEST);
        problem.setTitle("Validation Failed");
        problem.setProperty("errors", ex.getBindingResult().getFieldErrors().stream()
                .map(err -> err.getField() + ": " + err.getDefaultMessage()).toList());
        return problem;
    }
}`,
  },
  {
    id: 'file-test',
    path: 'src/test/java/com/acme/orders/order/OrderRepositoryTest.java',
    layer: 'Testing',
    roleSummary: 'Fast persistence slice test wired to a real PostgreSQL container via Spring Boot 3.1+ @ServiceConnection.',
    keyAnnotations: ['@DataJpaTest', '@Testcontainers', '@ServiceConnection'],
    architecturalRule:
      'Do not test PostgreSQL queries against H2 in-memory mode; use @ServiceConnection with Testcontainers so Flyway SQL and types match production.',
    language: 'java',
    code: `package com.acme.orders.order;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.jdbc.AutoConfigureTestDatabase;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;
import org.springframework.boot.testcontainers.service.connection.ServiceConnection;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;
import static org.assertj.core.api.Assertions.assertThat;

@DataJpaTest
@Testcontainers
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.NONE)
class OrderRepositoryTest {

    @Container
    @ServiceConnection
    static PostgreSQLContainer<?> postgres = new PostgreSQLContainer<>("postgres:16-alpine");

    @Autowired
    private OrderRepository orderRepository;

    @Test
    void persistsAndProjectsOrderSummary() {
        OrderEntity saved = orderRepository.save(
                OrderEntity.createPending(java.util.UUID.randomUUID(), 4990, "USD")
        );
        assertThat(orderRepository.findSummaryById(saved.getId()))
                .isPresent()
                .get()
                .extracting(OrderSummaryProjection::getTotalCents)
                .isEqualTo(4990L);
    }
}`,
  },
];

export const SPRING_BOOT_CHAPTERS: SpringBootChapter[] = [
  {
    id: 'sb-ioc-autoconfig',
    order: '01',
    title: 'IoC Container, Auto-Configuration & Bean Lifecycle',
    subtitle:
      'How Spring Boot discovers beans, evaluates @Conditional rules at startup, builds the ApplicationContext, and wraps proxies around your services.',
    category: 'Core & IoC',
    readMinutes: 8,
    summaryTakeaway:
      'Spring Boot is standard Spring Framework plus deterministic, condition-evaluated AutoConfiguration classes loaded from `META-INF/spring/org.springframework.boot.autoconfigure.AutoConfiguration.imports`.',
    lifecycleSteps: [
      {
        step: '1. Bootstrap & Environment',
        component: 'SpringApplication.run()',
        responsibility:
          'Loads application.yml, env vars, and active profiles into ConfigurableEnvironment before creating any beans.',
      },
      {
        step: '2. BeanDefinition Registry',
        component: 'ClassPathBeanDefinitionScanner & AutoConfig',
        responsibility:
          'Scans @Component/@Service/@Repository classes and evaluates @ConditionalOnClass / @ConditionalOnMissingBean.',
      },
      {
        step: '3. Instantiate & Inject',
        component: 'Constructor Injection',
        responsibility:
          'Instantiates singletons in dependency graph order, passing immutable final collaborators via constructors.',
      },
      {
        step: '4. Post-Process & Proxy',
        component: 'BeanPostProcessor (CGLIB)',
        responsibility:
          'Wraps beans with @Transactional / @Async / @Cacheable proxies right after @PostConstruct initialization.',
      },
      {
        step: '5. Ready & Graceful Stop',
        component: 'SmartLifecycle / @PreDestroy',
        responsibility:
          'Starts embedded Tomcat on port 8080; on SIGTERM drains in-flight HTTP requests before closing HikariCP.',
      },
    ],
    theoryParagraphs: [
      'At the heart of Spring Boot sits Spring Framework’s Inversion of Control (IoC) container (`ApplicationContext`). Instead of your classes instantiating dependencies with `new`, the container reads class metadata (`BeanDefinition`s), resolves the dependency DAG, instantiates beans (default scope: `singleton` per `ApplicationContext`), and wires them via constructor injection.',
      'Spring Boot removes boilerplate XML/Java config through Auto-Configuration. Every `spring-boot-starter-*` dependency brings curated libraries plus `@AutoConfiguration` classes listed in `AutoConfiguration.imports`. Each auto-config uses `@ConditionalOnClass` (is the library on the classpath?), `@ConditionalOnMissingBean` (did the user already define a custom bean?), and `@ConditionalOnProperty` so your explicit `@Bean` overrides Spring Boot’s defaults without conflict.',
      'Understanding `BeanPostProcessor` is the key to senior Spring interviews: annotations like `@Transactional` and `@Async` do nothing by themselves—they are activated by `BeanPostProcessor`s during step 4 of bean initialization, returning a CGLIB subclass proxy instead of the raw instance.',
    ],
    architectureRules: [
      'Always prefer single-constructor injection with `private final` fields—never use field `@Autowired` (which hides coupling and complicates unit tests).',
      'Custom `@Bean` definitions automatically back off default Boot beans because Boot guards defaults with `@ConditionalOnMissingBean`.',
      'Use `@ConfigurationProperties` with Java 21 `record` + `@Validated` to fail fast on invalid configuration at boot time.',
    ],
    codeExamples: [
      {
        label: 'Type-Safe @ConfigurationProperties + Conditional Auto-Config',
        language: 'java',
        code: `@Validated
@ConfigurationProperties(prefix = "acme.payments")
public record PaymentClientProperties(
    @NotBlank String baseUrl,
    @NotNull Duration connectTimeout,
    @Min(1) @Max(5) int maxRetries
) {}

@Configuration
public class PaymentClientConfig {

    @Bean
    @ConditionalOnMissingBean
    public RestClient paymentRestClient(RestClient.Builder builder, PaymentClientProperties props) {
        JdkClientHttpRequestFactory requestFactory = new JdkClientHttpRequestFactory();
        requestFactory.setReadTimeout(props.connectTimeout());
        return builder
                .baseUrl(props.baseUrl())
                .requestFactory(requestFactory)
                .build();
    }
}`,
        caption:
          'Immutable @ConfigurationProperties records validate startup config and cleanly configure Spring Framework 6.1 RestClient.',
      },
    ],
    pitfalls: [
      {
        title: 'Circular Dependencies Between Services',
        symptom:
          'BeanCurrentlyInCreationException: Requested bean is currently in creation: Is there an unresolvable circular reference?',
        rootCause:
          'ServiceA injects ServiceB in its constructor while ServiceB injects ServiceA; since Spring Boot 2.6, circular references fail by default.',
        fix:
          'Extract the shared logic into a third domain collaborator ServiceC, or decouple via ApplicationEventPublisher instead of enabling allow-circular-references.',
      },
      {
        title: 'Storing Mutable Request State in Singleton Beans',
        symptom:
          'User A intermittently receives User B’s order details under concurrent traffic.',
        rootCause:
          'All @Service and @RestController beans are singletons by default; instance fields are shared across every HTTP thread.',
        fix:
          'Keep all Spring beans stateless (only final injected dependencies). Pass per-request state via method parameters or SecurityContextHolder.',
      },
    ],
    linkedDrillId: 'drill-spring-transactional',
  },
  {
    id: 'sb-package-architecture',
    order: '02',
    title: 'Layered & Package-by-Feature Code Architecture',
    subtitle:
      'How real production Spring Boot projects organize packages, enforce layer boundaries, separate DTOs from Entities, and scale cleanly across teams.',
    category: 'Architecture',
    readMinutes: 9,
    summaryTakeaway:
      'Organize Spring Boot codebases by business feature (`order/`, `payment/`, `customer/`) rather than giant global `controllers/` and `services/` buckets, keeping entities and repositories package-private where possible.',
    lifecycleSteps: [
      {
        step: '1. Web Boundary',
        component: 'OrderController + Request/Response Records',
        responsibility:
          'Deserializes JSON DTOs, runs Bean Validation (@Valid), calls Service, returns HTTP status + DTO.',
      },
      {
        step: '2. Application Service',
        component: 'OrderService (@Service)',
        responsibility:
          'Opens @Transactional boundary, coordinates domain entities, enforces business rules, emits outbox events.',
      },
      {
        step: '3. Domain Model',
        component: 'OrderEntity + Domain Methods',
        responsibility:
          'Encapsulates state transitions (e.g. order.markPaid()) instead of exposing raw public setters.',
      },
      {
        step: '4. Persistence Gateway',
        component: 'OrderRepository (Spring Data JPA)',
        responsibility:
          'Executes typed queries and projections against PostgreSQL inside the active Service transaction.',
      },
      {
        step: '5. Shared Infrastructure',
        component: 'shared/ (ProblemDetail, Security, Clock)',
        responsibility:
          'Cross-cutting advice, JWT filter chain, Jackson config, and Flyway SQL migrations.',
      },
    ],
    theoryParagraphs: [
      'Most beginner Spring Boot tutorials organize packages horizontally (`com.app.controller`, `com.app.service`, `com.app.repository`). As soon as an app exceeds 10 entities, every feature edit touches 5 distant folders and every class must be `public`, erasing encapsulation.',
      'Production Spring Boot teams organize **vertically by feature/module** (`com.acme.orders.order`, `com.acme.orders.inventory`, `com.acme.orders.shared`). Inside each feature package, `OrderController`, `OrderService`, `OrderRepository`, `OrderEntity`, and DTO records live side-by-side. Even better: `OrderRepository` and `OrderEntity` can stay **package-private**, forcing other modules (like `shipping`) to talk through `OrderService`’s public contract—an architecture that can even be verified in CI using **Spring Modulith** or **ArchUnit**.',
      'Equally critical is **DTO vs. Entity separation**. Exposing a `@Entity` directly from a `@RestController` leaks internal database columns, invites mass-assignment security bugs on POST/PUT, and triggers lazy-loading crashes or infinite JSON recursion.',
    ],
    architectureRules: [
      'Strict dependency direction: `Controller -> Service -> Repository -> Database`. Repositories must NEVER import Controllers or Services.',
      'Use Java 21 `record` types for immutable Request/Response DTOs—never pass `@Entity` objects across HTTP boundaries.',
      'Let Flyway (`src/main/resources/db/migration/V1__init.sql`) manage PostgreSQL DDL with `spring.jpa.hibernate.ddl-auto=validate`.',
    ],
    codeExamples: [
      {
        label: 'Feature Package Layout & ArchUnit Boundary Rule',
        language: 'java',
        code: `// Recommended Package-by-Feature Tree:
// com.acme.orders
// ├── OrdersApplication.java
// ├── order/
// │   ├── OrderController.java       (public HTTP API)
// │   ├── OrderService.java          (public module API + @Transactional)
// │   ├── OrderRepository.java       (package-private Spring Data JPA)
// │   ├── OrderEntity.java           (package-private JPA aggregate)
// │   └── OrderDtos.java             (CreateOrderRequest / OrderResponse records)
// ├── payment/ ...
// └── shared/
//     ├── GlobalExceptionHandler.java
//     └── SecurityConfig.java

// Enforcing Clean Layer Boundaries in JUnit via ArchUnit:
@AnalyzeClasses(packages = "com.acme.orders")
class ArchitectureRulesTest {
    @ArchTest
    static final ArchRule controllers_never_touch_repositories =
        noClasses().that().resideInAPackage("..order..")
            .and().haveSimpleNameEndingWith("Controller")
            .should().dependOnClassesThat().haveSimpleNameEndingWith("Repository");
}`,
      },
    ],
    pitfalls: [
      {
        title: 'Anemic Service Sprawl & Fat Controllers',
        symptom:
          'Controllers contain `if (user.isActive() && repo.count() > 0)` logic and call 3 repositories directly without a transaction.',
        rootCause:
          'Treating `@RestController` as the orchestration layer splits database reads across separate auto-committed transactions.',
        fix:
          'Move all orchestration and business invariants into `@Service` inside one `@Transactional` method; keep Controllers strictly to HTTP mapping.',
      },
      {
        title: 'Using `ddl-auto: update` in Production',
        symptom:
          'Production deploy fails or leaves stale/null columns after renaming a field on a JPA `@Entity`.',
        rootCause:
          'Hibernate auto-DDL cannot safely drop columns, backfill data, or create concurrent PostgreSQL indexes without table locks.',
        fix:
          'Set `spring.jpa.hibernate.ddl-auto=validate` and version every schema change with Flyway or Liquibase.',
      },
    ],
    linkedDrillId: 'drill-java-sealed-switch',
  },
  {
    id: 'sb-web-mvc',
    order: '03',
    title: 'Spring Web MVC, Bean Validation & RFC 7807 ProblemDetail',
    subtitle:
      'Trace every step from incoming TCP/HTTP bytes through Filters, DispatcherServlet, Jackson, Bean Validation, and global exception handling.',
    category: 'Web & APIs',
    readMinutes: 8,
    summaryTakeaway:
      'Servlet Filters (like Spring Security) run BEFORE DispatcherServlet; HandlerInterceptors, @Valid ArgumentResolvers, and @RestControllerAdvice run INSIDE DispatcherServlet.',
    lifecycleSteps: [
      {
        step: '1. Servlet Filter Chain',
        component: 'SecurityFilterChain / OncePerRequestFilter',
        responsibility:
          'Runs before Spring MVC: validates JWT/cookies, populates SecurityContextHolder, rejects 401/403 early.',
      },
      {
        step: '2. Front Controller',
        component: 'DispatcherServlet',
        responsibility:
          'Consults RequestMappingHandlerMapping to match HTTP verb, path, headers, and content-type to a controller method.',
      },
      {
        step: '3. Deserialize & Validate',
        component: 'Jackson + Jakarta Bean Validation',
        responsibility:
          'Parses JSON into Java record DTOs and executes @NotNull / @Positive / @Size before entering your method body.',
      },
      {
        step: '4. Controller Execution',
        component: '@RestController Method',
        responsibility:
          'Invokes @Service and returns ResponseEntity<T> with 200/201/204 status and Location headers.',
      },
      {
        step: '5. Global Error Mapping',
        component: '@RestControllerAdvice',
        responsibility:
          'Catches domain & validation exceptions and formats consistent application/problem+json ProblemDetail payloads.',
      },
    ],
    theoryParagraphs: [
      'Every HTTP request hitting Spring Boot’s embedded Tomcat first traverses the **Servlet Filter Chain**—that is where Spring Security, CORS, request-ID logging (`MDC`), and rate limiting execute. Only if filters call `filterChain.doFilter(...)` does the request reach Spring MVC’s `DispatcherServlet`.',
      'Inside `DispatcherServlet`, `RequestMappingHandlerAdapter` uses `HttpMessageConverter`s (Jackson by default) to bind `@RequestBody` JSON onto your Java record, and invokes `Validator` whenever `@Valid` is present. If validation fails, Spring throws `MethodArgumentNotValidException` before a single line of your controller executes.',
      'Spring Framework 6 / Spring Boot 3 ships first-class **RFC 9457 / 7807 `ProblemDetail`** support. Pair `@RestControllerAdvice` with `ResponseEntityExceptionHandler` so every `4xx`/`5xx` error returns structured `type`, `title`, `status`, and `detail` fields that React/TypeScript frontends can parse reliably.',
    ],
    architectureRules: [
      'Always validate incoming DTOs at the API edge with `@Valid` + `jakarta.validation.constraints.*`.',
      'Use `ProblemDetail` via `@RestControllerAdvice` for uniform API errors—never scatter `try/catch` blocks inside controllers.',
      'Return `ResponseEntity.created(location)` on `POST` resource creation and `204 No Content` on idempotent `DELETE`.',
    ],
    codeExamples: [
      {
        label: 'Validated Java Record DTO + Controller Endpoint',
        language: 'java',
        code: `public record CreateOrderRequest(
    @NotNull(message = "customerId is required")
    UUID customerId,

    @Positive(message = "totalCents must be greater than zero")
    long totalCents,

    @NotBlank @Size(min = 3, max = 3)
    String currency,

    @NotEmpty
    List<@Valid OrderLineRequest> items
) {}

@RestController
@RequestMapping("/api/v1/orders")
public class OrderController {
    private final OrderService service;

    public OrderController(OrderService service) {
        this.service = service;
    }

    @PostMapping
    public ResponseEntity<OrderResponse> create(@Valid @RequestBody CreateOrderRequest req) {
        OrderResponse res = service.placeOrder(req);
        return ResponseEntity.created(URI.create("/api/v1/orders/" + res.orderId())).body(res);
    }
}`,
      },
    ],
    pitfalls: [
      {
        title: 'Forgetting `@Valid` on Nested Collections or Controller Parameters',
        symptom:
          'Invalid line items inside `List<OrderLineRequest>` pass right through into the Service layer.',
        rootCause:
          'Bean Validation does not cascade into nested objects or generic collection elements unless `@Valid` is placed inside `List<@Valid Item>`.',
        fix:
          'Annotate nested DTO fields and list elements with `@Valid`, and add `@Validated` on the controller class if validating `@PathVariable` or `@RequestParam`.',
      },
    ],
    linkedDrillId: 'drill-spring-security-chain',
  },
  {
    id: 'sb-data-jpa',
    order: '04',
    title: 'Spring Data JPA, Dirty Checking & N+1 Prevention',
    subtitle:
      'Master Hibernate’s Persistence Context, why Open-Session-in-View hurts production latency, and how to eliminate N+1 queries cleanly.',
    category: 'Data & Persistence',
    readMinutes: 10,
    summaryTakeaway:
      'Hibernate buffers entity mutations in the Persistence Context until flush/commit. Disable open-in-view, use DTO projections for reads, and use @EntityGraph or JOIN FETCH when loading associations.',
    lifecycleSteps: [
      {
        step: '1. Query Dispatch',
        component: 'Spring Data Proxy',
        responsibility:
          'Translates derived method names, @Query JPQL, or native SQL into JDBC PreparedStatements.',
      },
      {
        step: '2. 1st-Level Cache',
        component: 'Hibernate Persistence Context',
        responsibility:
          'Stores loaded Managed entities per transaction; repeat findById(id) hits memory without extra SQL.',
      },
      {
        step: '3. Dirty Checking',
        component: 'Snapshot Diff on Flush',
        responsibility:
          'On @Transactional commit, compares Managed entities to initial snapshots and emits UPDATE only for changed rows.',
      },
      {
        step: '4. Read Optimization',
        component: 'Interface / Record Projections',
        responsibility:
          'Bypasses entity hydration and dirty-checking snapshots completely by selecting only needed columns.',
      },
      {
        step: '5. Concurrency Guard',
        component: '@Version / PESSIMISTIC_WRITE',
        responsibility:
          'Appends WHERE version = ? on UPDATE (optimistic) or SELECT ... FOR UPDATE (pessimistic) for inventory/balances.',
      },
    ],
    theoryParagraphs: [
      'Spring Data JPA sits atop Hibernate (`EntityManager`). Within an active `@Transactional` method, loaded entities become **Managed** inside the transaction-scoped `PersistenceContext` (1st-level cache). When you mutate a managed entity’s field (`order.markPaid()`), you do not even need to call `save()` again—at transaction commit, Hibernate performs **dirty checking** against the load-time snapshot and issues an `UPDATE`.',
      'By default, Spring Boot enables `spring.jpa.open-in-view=true` (OSIV), keeping the Hibernate session and database connection open during HTTP JSON serialization. In production APIs, OSIV is a silent killer: Jackson traversing a `@OneToMany` field triggers **N+1 lazy queries** outside your service transaction while holding a HikariCP connection idle during slow network writes.',
      'Always set `spring.jpa.open-in-view=false`. When a read endpoint needs parent + children, fetch them in 1 SQL query using `@EntityGraph` or `JOIN FETCH`. When displaying lists or summaries, fetch a **DTO / Interface Projection** directly in JPQL, and always use **keyset pagination** (`WHERE (created_at, id) < (...)`) instead of deep `OFFSET` pages.',
    ],
    architectureRules: [
      'Always set `spring.jpa.open-in-view=false` in `application.yml` so accidental lazy fetches fail loudly in dev/tests.',
      'Use `@OneToMany(fetch = FetchType.LAZY)` (and set `@ManyToOne(fetch = FetchType.LAZY)` explicitly, since `@ManyToOne` defaults to `EAGER`!).',
      'Prefer `JOIN FETCH` / `@EntityGraph` for write graphs and `DTO Projections` for read-only screens.',
    ],
    codeExamples: [
      {
        label: 'Avoiding N+1 with @EntityGraph & DTO Projection',
        language: 'java',
        code: `public interface OrderSummaryProjection {
    UUID getOrderId();
    OrderStatus getStatus();
    long getTotalCents();
}

public interface OrderRepository extends JpaRepository<OrderEntity, UUID> {

    // 1. Lean SELECT (0 entity hydration, 0 dirty-check memory overhead)
    @Query("""
        select o.id as orderId, o.status as status, o.totalCents as totalCents
        from OrderEntity o
        where o.customerId = :customerId
        order by o.createdAt desc
    """)
    List<OrderSummaryProjection> findRecentSummaries(UUID customerId, Pageable pageable);

    // 2. Single-query graph load when mutating order + items together
    @EntityGraph(attributePaths = {"lineItems"})
    Optional<OrderEntity> findWithLineItemsById(UUID id);
}`,
      },
    ],
    pitfalls: [
      {
        title: 'Default `@ManyToOne` EAGER Fetching Cascade',
        symptom:
          'Loading 50 `OrderItem` rows unexpectedly fires 50 extra `SELECT * FROM products WHERE id = ?` queries.',
        rootCause:
          'JPA specifies `FetchType.EAGER` as the default for `@ManyToOne` and `@OneToOne`.',
        fix:
          'Explicitly declare `(fetch = FetchType.LAZY)` on every `@ManyToOne` and `@OneToOne` association.',
      },
      {
        title: 'Using `JOIN FETCH` Together with `Pageable`',
        symptom:
          'Hibernate logs `HHH90003004: firstResult/maxResults specified with collection fetch; applying in memory!` and loads the entire table into JVM RAM.',
        rootCause:
          'SQL joins multiply parent rows per child, making SQL `LIMIT/OFFSET` inaccurate for parent counts.',
        fix:
          'Fetch paginated parent IDs first (`SELECT o.id ...`), then hydrate children via `WHERE o.id IN :ids` or use `@BatchSize(size = 50)`.',
      },
    ],
    linkedDrillId: 'drill-fullstack-keyset-pagination',
  },
  {
    id: 'sb-transactions-async',
    order: '05',
    title: 'Transactions, AOP Proxies, Virtual Threads & Async',
    subtitle:
      'Control transaction propagation, avoid self-invocation proxy traps, tune HikariCP pools, and scale blocking I/O on Java 21 Virtual Threads.',
    category: 'Transactions & Async',
    readMinutes: 9,
    summaryTakeaway:
      'Every @Transactional, @Async, and @Cacheable annotation relies on CGLIB proxy interception. Keep transactions short, separate collaborator beans, and enable spring.threads.virtual.enabled=true on Java 21+.',
    lifecycleSteps: [
      {
        step: '1. Proxy Entry',
        component: 'OrderService$$SpringCGLIB',
        responsibility:
          'External caller invokes Spring CGLIB subclass; TransactionInterceptor begins JDBC transaction.',
      },
      {
        step: '2. ThreadLocal Bind',
        component: 'TransactionSynchronizationManager',
        responsibility:
          'Checks out 1 HikariCP connection and binds it to the calling thread for all DAO calls.',
      },
      {
        step: '3. Sub-Transaction',
        component: 'Collaborator Bean (REQUIRES_NEW)',
        responsibility:
          'Calling another @Service bean traverses its proxy; REQUIRES_NEW suspends Conn #1 and borrows Conn #2.',
      },
      {
        step: '4. Async Handoff',
        component: '@Async / VirtualThreadExecutor',
        responsibility:
          'Runs background work on a separate thread—remember ThreadLocal transactions do NOT cross thread boundaries!',
      },
      {
        step: '5. Commit / Rollback',
        component: 'PlatformTransactionManager',
        responsibility:
          'Commits on normal return or checked exceptions (unless rollbackFor = Exception.class); rolls back on RuntimeException.',
      },
    ],
    theoryParagraphs: [
      'Spring Boot wires transaction management automatically via `TransactionInterceptor` and CGLIB subclass proxies. Because interception happens at the proxy boundary, **internal `this.method()` calls bypass `@Transactional`, `@Async`, and `@Cacheable` completely**. Always split cross-boundary methods (like `REQUIRES_NEW` audit logs) into a dedicated collaborator bean.',
      'With **Java 21 + Spring Boot 3.2+**, setting `spring.threads.virtual.enabled=true` configures Tomcat and `@Async` (`SimpleAsyncTaskExecutor`) to run every request on lightweight **Virtual Threads** instead of a fixed 200-thread OS pool. That means clean, readable synchronous Spring MVC + JDBC code scales to thousands of concurrent slow I/O calls—provided you replace `synchronized` blocks around I/O with `ReentrantLock` to avoid carrier thread pinning.',
      'For distributed scheduled jobs (`@Scheduled`), remember multiple Kubernetes pods will all fire the cron job simultaneously unless guarded by a distributed lock like **ShedLock** backed by PostgreSQL.',
    ],
    architectureRules: [
      'Always specify `rollbackFor = Exception.class` on write transactions so checked exceptions cannot silently leave partial commits.',
      'When using `Propagation.REQUIRES_NEW`, size HikariCP carefully (`pool >= concurrent * 2`) to prevent self-deadlock.',
      'Trigger `@Async` side effects (emails, webhooks) only AFTER commit via `@TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)`.',
    ],
    codeExamples: [
      {
        label: 'Safe Post-Commit Event Listener + @Async Notification',
        language: 'java',
        code: `@Service
public class OrderService {
    private final OrderRepository repo;
    private final ApplicationEventPublisher events;

    public OrderService(OrderRepository repo, ApplicationEventPublisher events) {
        this.repo = repo;
        this.events = events;
    }

    @Transactional(rollbackFor = Exception.class)
    public OrderResponse placeOrder(CreateOrderRequest req) {
        OrderEntity saved = repo.save(OrderEntity.createPending(req.customerId(), req.totalCents(), req.currency()));
        events.publishEvent(new OrderPlacedEvent(saved.getId(), saved.getCustomerId()));
        return OrderResponse.from(saved);
    }
}

@Component
public class OrderNotificationListener {
    // Runs ONLY if the DB transaction actually committed—never fires on rollback!
    @Async
    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    public void onOrderPlaced(OrderPlacedEvent event) {
        // Send confirmation email or webhook safely outside DB transaction
    }
}`,
      },
    ],
    pitfalls: [
      {
        title: 'Sending Emails / Kafka Events Before DB Commit',
        symptom:
          'Downstream consumer queries PostgreSQL for `orderId` from a Kafka message and gets 404 Not Found.',
        rootCause:
          'The Kafka send succeeded while the `@Transactional` method was still open (or later rolled back).',
        fix:
          'Use the Transactional Outbox pattern for guaranteed delivery, or `@TransactionalEventListener(phase = AFTER_COMMIT)` for best-effort side effects.',
      },
    ],
    linkedDrillId: 'drill-spring-transactional',
  },
  {
    id: 'sb-ops-observability',
    order: '06',
    title: 'Profiles, Actuator, Observability & Graceful Shutdown',
    subtitle:
      'Production-readiness essentials: configuration precedence, Kubernetes liveness/readiness probes, Micrometer metrics, and zero-downtime deploys.',
    category: 'Ops & Config',
    readMinutes: 7,
    summaryTakeaway:
      'Spring Boot Actuator + Micrometer gives production health probes, Prometheus metrics, and distributed tracing out of the box when paired with graceful shutdown.',
    lifecycleSteps: [
      {
        step: '1. Config Layering',
        component: 'Environment PropertySources',
        responsibility:
          'Resolves Env Vars > command-line args > application-{profile}.yml > application.yml defaults.',
      },
      {
        step: '2. Liveness & Readiness',
        component: '/actuator/health/liveness & readiness',
        responsibility:
          'Tells Kubernetes whether to restart a wedged JVM or stop routing traffic during startup/shutdown.',
      },
      {
        step: '3. Metrics & Tracing',
        component: 'Micrometer + OpenTelemetry',
        responsibility:
          'Records HTTP latency histograms, HikariCP pool wait times, JVM GC pauses, and traceId/spanId propagation.',
      },
      {
        step: '4. Zero-Downtime Stop',
        component: 'server.shutdown=graceful',
        responsibility:
          'Stops accepting new connections on SIGTERM and waits up to timeout-per-shutdown-phase for active requests to finish.',
      },
    ],
    theoryParagraphs: [
      'Spring Boot loads configuration in strict precedence order: OS environment variables and CLI arguments override `application-{profile}.yml`, which overrides base `application.yml`. Never commit database passwords or JWT signing keys to YAML—inject them via environment variables or secret mounts.',
      '`spring-boot-starter-actuator` exposes `/actuator/health/readiness` and `/actuator/health/liveness`. When `management.endpoint.health.probes.enabled=true`, Spring Boot separates `LivenessState` (is the JVM event loop alive?) from `ReadinessState` (are PostgreSQL/Redis healthy and is shutdown not yet triggered?).',
      'On deploy (`SIGTERM`), enabling `server.shutdown=graceful` switches Readiness to `REFUSING_TRAFFIC` immediately, drains active HTTP requests before tearing down the `ApplicationContext`, and prevents mid-flight `502 Bad Gateway` errors.',
    ],
    architectureRules: [
      'Never expose `/actuator/env` or `/actuator/heapdump` publicly without authentication—expose only `health,info,prometheus` on internal management ports.',
      'Use custom `HealthIndicator` only on Readiness probes for hard dependencies; never put external third-party APIs on Liveness probes or Kubernetes will crash-loop your pods.',
      'Configure `spring.lifecycle.timeout-per-shutdown-phase=20s` alongside `server.shutdown=graceful`.',
    ],
    codeExamples: [
      {
        label: 'Custom Micrometer Metric + Observed Service Call',
        language: 'java',
        code: `@Service
public class CheckoutMetricsService {
    private final MeterRegistry meterRegistry;

    public CheckoutMetricsService(MeterRegistry meterRegistry) {
        this.meterRegistry = meterRegistry;
    }

    @Observed(name = "orders.checkout", contextualName = "place-order")
    public void recordOrderPlaced(String currency, long totalCents) {
        meterRegistry.counter("orders_placed_total", "currency", currency).increment();
        meterRegistry.summary("orders_value_cents", "currency", currency).record(totalCents);
    }
}`,
      },
    ],
    pitfalls: [
      {
        title: 'Putting External Downstream APIs Inside Liveness Probe',
        symptom:
          'Third-party Stripe outage causes Kubernetes to endlessly kill and restart all your healthy API pods.',
        rootCause:
          'Default `/actuator/health` aggregates every `HealthIndicator`; if wired to `livenessProbe`, any dependency blip kills the pod.',
        fix:
          'Keep `livenessProbe` scoped strictly to JVM internal state (`/actuator/health/liveness`) and check DB only on `readinessProbe`.',
      },
    ],
    linkedDrillId: 'drill-outbox-idempotency',
  },
  {
    id: 'sb-testing-pyramid',
    order: '07',
    title: 'Spring Boot Testing Pyramid & Testcontainers Slices',
    subtitle:
      'Choose the right test slice (@WebMvcTest, @DataJpaTest, @SpringBootTest) so your suite catches real SQL/JSON bugs while running fast.',
    category: 'Testing',
    readMinutes: 8,
    summaryTakeaway:
      'Do not boot the entire @SpringBootTest context for every controller or repository test. Match each test to its minimal slice and back persistence tests with real PostgreSQL via @ServiceConnection.',
    lifecycleSteps: [
      {
        step: '1. Pure Unit Tests',
        component: 'Plain JUnit 5 + AssertJ (0ms Spring boot)',
        responsibility:
          'Tests domain calculations, state transitions, and service rules using constructor-injected fakes/Mockito.',
      },
      {
        step: '2. Web Slice',
        component: '@WebMvcTest + MockMvc + @MockitoBean',
        responsibility:
          'Boots only MVC, Jackson, Security filters, and @RestControllerAdvice to verify routes, 400 validation, and JSON.',
      },
      {
        step: '3. Data Slice',
        component: '@DataJpaTest + @ServiceConnection',
        responsibility:
          'Boots Hibernate + Flyway against real PostgreSQL Testcontainers to verify JPQL, indexes, and constraints.',
      },
      {
        step: '4. End-to-End Integration',
        component: '@SpringBootTest(RANDOM_PORT)',
        responsibility:
          'Verifies full vertical flows across HTTP, Spring Security, @Transactional services, and PostgreSQL.',
      },
    ],
    theoryParagraphs: [
      'A classic Spring Boot mistake is putting `@SpringBootTest` on 200 tests, booting the full ApplicationContext repeatedly, or mocking `OrderRepository` on every query so nobody ever verifies whether the JPQL or Flyway migration actually runs on PostgreSQL.',
      'Spring Boot provides **Test Slices** that load only one architectural layer: `@WebMvcTest(OrderController.class)` loads Tomcat/MockMvc, Jackson, Bean Validation, and `GlobalExceptionHandler` without touching a database. `@DataJpaTest` loads only JPA repositories and rolls back each test automatically.',
      'Since Spring Boot 3.1, **`@ServiceConnection`** eliminates `@DynamicPropertySource` boilerplate: annotate a `static PostgreSQLContainer<?>` field with `@ServiceConnection`, and Boot automatically wires `spring.datasource.url`, username, and password.',
    ],
    architectureRules: [
      'Never use H2 in-memory mode to test PostgreSQL `JSONB`, `SKIP LOCKED`, `ON CONFLICT`, or partial index queries—always use `@ServiceConnection` with `postgres:16-alpine`.',
      'Share a `static` singleton Testcontainer across integration tests so Docker starts PostgreSQL once per JVM test run instead of per test class.',
      'Use `@MockitoBean` (Spring Boot 3.4+, replacing deprecated `@MockBean`) only in `@WebMvcTest` or for external HTTP clients.',
    ],
    codeExamples: [
      {
        label: '@WebMvcTest Slice Verifying Validation & ProblemDetail Contract',
        language: 'java',
        code: `@WebMvcTest(OrderController.class)
@Import(GlobalExceptionHandler.class)
class OrderControllerWebTest {

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private OrderService orderService;

    @Test
    void rejectsNegativeOrderTotalWithProblemDetail() throws Exception {
        mockMvc.perform(post("/api/v1/orders")
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                    {"customerId":"11111111-1111-1111-1111-111111111111","totalCents":-50,"currency":"USD","items":[]}
                """))
            .andExpect(status().isBadRequest())
            .andExpect(jsonPath("$.title").value("Validation Failed"));
    }
}`,
      },
    ],
    pitfalls: [
      {
        title: 'Context Cache Thrashing in CI',
        symptom:
          'Integration test suite takes 12 minutes because Spring rebuilds the entire ApplicationContext 18 times.',
        rootCause:
          'Varying `@MockitoBean` combinations or `@DirtiesContext` across test classes invalidates Spring’s TestContext cache key.',
        fix:
          'Centralize shared Testcontainers configuration in an abstract base class or `@TestConfiguration`, and avoid `@DirtiesContext`.',
      },
    ],
    linkedDrillId: 'drill-outbox-idempotency',
  },
];
