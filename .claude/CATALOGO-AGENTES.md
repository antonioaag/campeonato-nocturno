# Catálogo de agentes (The Agency)

282 agentes de [msitarzewski/agency-agents](https://github.com/msitarzewski/agency-agents), agrupados por división. Las descripciones están traducidas al español; los nombres se dejan en inglés porque así los reconoce Claude al usarlos.

## Cómo activar uno

Cada agente activo suma su descripción a **todos** los mensajes, así que conviene tener activos solo los que usas.

1. Busca el agente en este catálogo y copia su `id` (la primera columna).
2. Actívalo, de una de estas dos formas:
   - Pídeselo a Claude en el chat: *"activa el agente engineering-code-reviewer"*.
   - O córrelo tú en la terminal: `.claude/agentes.sh activar engineering-code-reviewer`
3. Sube el cambio (commit y push) para que quede en las sesiones futuras.
4. Abre una sesión nueva: los agentes se cargan al arrancar.
5. Úsalo por su nombre: *"usa el agente Code Reviewer para revisar mi último cambio"*.

Otros comandos:

```bash
.claude/agentes.sh buscar seguridad      # busca en este catálogo
.claude/agentes.sh activos               # lista los activos
.claude/agentes.sh desactivar <id>       # lo quita (y luego commit)
```

## Recomendados para este proyecto

| id | Para qué sirve aquí |
|---|---|
| `engineering-code-reviewer` | Revisar un cambio antes de subirlo a producción. |
| `engineering-minimal-change-engineer` | Arreglar un bug sin tocar nada más (diffs mínimos). |
| `engineering-frontend-developer` | Cambios en `public/index.html`, Tailwind, tablas y formularios. |
| `engineering-backend-architect` | Rutas de Express, `server/` y diseño de la API. |
| `engineering-database-optimizer` | Consultas y esquema en Turso/SQLite. |
| `testing-api-tester` | Probar las rutas contra el puerto 3100. |
| `testing-reality-checker` | Segunda opinión escéptica: "¿esto de verdad funciona?". |
| `testing-accessibility-auditor` | Que la app se lea bien en celular y con lector de pantalla. |
| `security-appsec-engineer` | Revisar login, JWT, permisos de admin y CSP. |
| `engineering-technical-writer` | Documentación y README. |

## Todos los agentes

### Ingeniería de software (65)

| id | Nombre | Descripción |
|---|---|---|
| `engineering-ai-data-remediation-engineer` | AI Data Remediation Engineer | Pipelines de datos que se reparan solos: detecta, clasifica y corrige anomalías en los datos con modelos locales, sin perder información. |
| `engineering-ai-engineer` | AI Engineer | Ingeniero de IA/ML: desarrolla, despliega e integra modelos de machine learning en sistemas en producción. |
| `engineering-api-platform-engineer` | API Platform Engineer | APIs públicas y para socios: diseño por contrato (OpenAPI/gRPC), versionado, SDKs, gateway (autenticación, límites de uso) y portal para desarrolladores. |
| `engineering-ats-validator-architect` | ATS Validator Architect | Diseña y valida sistemas de seguimiento de postulantes (ATS) y lectores de currículums, con cumplimiento normativo. |
| `engineering-autonomous-optimization-architect` | Autonomous Optimization Architect | Vigila APIs en segundo plano para medir rendimiento, con controles de costo y seguridad que evitan gastos descontrolados. |
| `engineering-backend-architect` | Backend Architect | Arquitecto backend: diseño de sistemas escalables, bases de datos, APIs e infraestructura en la nube. |
| `engineering-cms-developer` | CMS Developer | Especialista en Drupal y WordPress: temas, plugins/módulos a medida y estructura de contenidos. |
| `engineering-china-network-engineer` | China Network Engineer | Redes empresariales en China continental (Huawei, H3C, Ruijie, Hillstone): ruteo, switching, firewall y normativa local. |
| `engineering-code-reviewer` | Code Reviewer | Revisor de código: comentarios concretos sobre corrección, mantenibilidad, seguridad y rendimiento, no sobre gustos de estilo. |
| `engineering-codebase-onboarding-engineer` | Codebase Onboarding Engineer | Ayuda a entender rápido un código desconocido: lee el código, sigue los flujos y solo afirma lo que el código respalda. |
| `engineering-data-engineer` | Data Engineer | Ingeniero de datos: pipelines confiables, lakehouses, ETL/ELT, Spark, dbt y streaming. |
| `engineering-data-visualization-engineer` | Data Visualization Engineer | Visualización de datos: elegir el gráfico correcto, codificaciones honestas, paletas aptas para daltonismo y gráficos interactivos. |
| `engineering-database-optimizer` | Database Optimizer | Bases de datos: diseño de esquemas, optimización de consultas, índices y ajuste de rendimiento (PostgreSQL, MySQL, Supabase). |
| `engineering-database-reliability-engineer` | Database Reliability Engineer | Confiabilidad de bases de datos: alta disponibilidad, réplicas, respaldos y restauración, migraciones sin cortes y simulacros de desastre. |
| `engineering-desktop-app-engineer` | Desktop App Engineer | Apps de escritorio con Electron y Tauri: seguridad entre procesos, firma de código, actualizaciones automáticas e integración con el sistema operativo. |
| `engineering-devops-automator` | DevOps Automator | DevOps: automatización de infraestructura, pipelines de CI/CD y operación en la nube. |
| `engineering-developer-tooling-engineer` | Developer Tooling Engineer | Herramientas de línea de comandos y plataformas internas con buena experiencia: comandos claros, errores útiles, autocompletado y distribución. |
| `engineering-drupal-performance` | Drupal Performance Engineer | Rendimiento de sitios Drupal 10/11: Core Web Vitals, cachés, consultas, imágenes y CDN. |
| `engineering-drupal-shopping-cart` | Drupal Shopping Cart Engineer | Tiendas en línea con Drupal Commerce: catálogo, pasarelas de pago, checkout, pedidos, impuestos y promociones. |
| `engineering-email-intelligence-engineer` | Email Intelligence Engineer | Extrae datos estructurados de hilos de correo para que los usen agentes de IA y automatizaciones. |
| `engineering-embedded-firmware-engineer` | Embedded Firmware Engineer | Firmware embebido y RTOS: ESP32, STM32, Arduino, ARM Cortex-M, nRF, FreeRTOS y Zephyr. |
| `engineering-feishu-integration-developer` | Feishu Integration Developer | Integraciones con Feishu (Lark): bots, mini programas, flujos de aprobación, webhooks, SSO y automatizaciones. |
| `engineering-filament-optimization-specialist` | Filament Optimization Specialist | Reestructura paneles de administración hechos con Filament (PHP) para hacerlos más usables y eficientes. |
| `engineering-finops-engineer` | FinOps Engineer | Costos de nube (AWS/GCP/Azure): asignación por etiquetas, dimensionamiento, reservas y paneles de costo por unidad de negocio. |
| `engineering-frontend-developer` | Frontend Developer | Desarrollador frontend: tecnologías web modernas, React/Vue/Angular, implementación de interfaces y rendimiento. |
| `engineering-gaussdb-expert` | GaussDB Expert Engineer | Experto en GaussDB OLTP (base de datos de Huawei): esquemas, tablas distribuidas, consultas, índices y rendimiento. |
| `engineering-git-workflow-master` | Git Workflow Master | Flujos de trabajo con Git: ramas, commits convencionales, rebase, worktrees y buenas prácticas para CI. |
| `engineering-it-service-manager` | IT Service Manager | Gestión de servicios de TI con ITIL 4: catálogo de servicios, incidentes, cambios, SLAs y mejora continua. |
| `engineering-identity-access-engineer` | Identity & Access Engineer | Identidad y acceso: OAuth 2.0/OIDC, SSO empresarial, passkeys, sesiones y permisos por roles o atributos. |
| `engineering-incident-response-commander` | Incident Response Commander | Dirige incidentes en producción: coordina la respuesta, conduce el post-mortem, define SLOs y diseña las guardias. |
| `engineering-i18n-engineer` | Internationalization Engineer | Internacionalización: mensajes ICU, plurales, idiomas de derecha a izquierda y formatos de fecha, número y moneda por país. |
| `engineering-iot-fleet-engineer` | IoT Fleet Engineer | Flotas de dispositivos IoT: alta e identidad de equipos, telemetría MQTT, actualizaciones remotas con vuelta atrás y monitoreo. |
| `engineering-knowledge-graph-engineer` | Knowledge Graph Engineer | Organiza información como grafo de entidades y relaciones para navegar contexto, ahorrar tokens y reducir alucinaciones. |
| `engineering-llm-post-training-engineer` | LLM Post-Training Engineer | Post-entrenamiento de modelos de lenguaje: SFT, RLHF/RLVR, optimización por preferencias y criterios para liberar un modelo. |
| `engineering-minimal-change-engineer` | Minimal Change Engineer | Cambios mínimos: arregla solo lo pedido, rechaza agrandar el alcance y evita abstracciones prematuras. |
| `engineering-mobile-app-builder` | Mobile App Builder | Desarrollo de apps móviles nativas (iOS/Android) y multiplataforma. |
| `engineering-mobile-release-engineer` | Mobile Release Engineer | Publicación de apps móviles: firma, perfiles, fastlane, envío a App Store y Play Store, lanzamientos graduales y seguimiento de errores. |
| `engineering-multi-agent-systems-architect` | Multi-Agent Systems Architect | Diseña sistemas de varios agentes de IA: topología, manejo de contexto, confianza entre agentes, recuperación de fallas y supervisión humana. |
| `engineering-network-engineer` | Network Engineer | Ingeniero de redes: Cisco, Juniper y Palo Alto; ruteo, switching, firewalls y diagnóstico. |
| `engineering-orgscript-engineer` | OrgScript Engineer | Diseña, analiza e implementa la gramática OrgScript y definiciones de reglas de negocio. |
| `engineering-pdf-engine-architect` | PDF Engine Architect | Generación determinista de PDF desde HTML con Playwright, tamaños de página dinámicos y PDF accesibles (PDF/UA, PDF/A). |
| `engineering-payments-billing-engineer` | Payments & Billing Engineer | Pagos y cobros: integración con Stripe/Adyen/PayPal, pagos idempotentes, webhooks, suscripciones, 3DS, PCI y conciliación. |
| `engineering-platform-engineer` | Platform Engineer | Plataforma interna para desarrolladores: caminos estándar e infraestructura de autoservicio que aceleran al equipo. |
| `engineering-privacy-engineer` | Privacy Engineer | Privacidad en el código: detección de datos personales, minimización, consentimiento, borrado automático y seudonimización. |
| `engineering-prompt-engineer` | Prompt Engineer | Diseña, prueba y optimiza prompts para modelos de lenguaje hasta lograr comportamientos confiables. |
| `engineering-rag-pipeline-engineer` | RAG Pipeline Engineer | Sistemas RAG en producción: fragmentación, calidad de recuperación, búsqueda híbrida, reordenamiento y evaluación. |
| `engineering-rapid-prototyper` | Rapid Prototyper | Prototipos y MVPs ultrarrápidos para validar ideas. |
| `engineering-realtime-collaboration-engineer` | Realtime Collaboration Engineer | Tiempo real: WebSocket/SSE, presencia, edición colaborativa (CRDT/OT), sincronización offline y reconexión segura. |
| `engineering-rust-refactoring-specialist` | Rust Refactoring Specialist | Refactorización de proyectos Rust: renombres seguros, reestructuración de módulos, eliminar duplicación y corregir avisos de Clippy. |
| `engineering-sre` | SRE (Site Reliability Engineer) | SRE: SLOs, presupuestos de error, observabilidad, ingeniería del caos y reducción de trabajo manual en producción. |
| `engineering-search-relevance-engineer` | Search Relevance Engineer | Buscadores con Elasticsearch/OpenSearch: índices, analizadores, ajuste de consultas, búsqueda híbrida con vectores y medición de relevancia. |
| `engineering-section-508-specialist` | Section 508 Accessibility Specialist | Accesibilidad según la norma federal de EE.UU. (Sección 508 / WCAG): ARIA, lectores de pantalla, teclado, contraste y auditorías. |
| `engineering-senior-developer` | Senior Developer | Implementación de alto nivel: Laravel/Livewire/FluxUI, CSS avanzado e integración con Three.js. |
| `engineering-servicenow-developer-mentor` | ServiceNow Developer & Mentor | Desarrollo en ServiceNow paso a paso: Business Rules, Script Includes, GlideRecord, Flow Designer y ACLs; aísla si el problema es de fábrica o de una personalización. |
| `engineering-software-architect` | Software Architect | Arquitecto de software: diseño de sistemas, diseño guiado por el dominio, patrones y decisiones técnicas. |
| `engineering-solidity-smart-contract-engineer` | Solidity Smart Contract Engineer | Contratos inteligentes en Solidity: arquitectura EVM, optimización de gas, proxies actualizables, DeFi y seguridad. |
| `engineering-technical-writer` | Technical Writer | Redactor técnico: documentación para desarrolladores, referencias de API, READMEs y tutoriales. |
| `engineering-uswds-developer` | USWDS Developer | Frontend con el sistema de diseño del gobierno de EE.UU. (USWDS): componentes accesibles y normas federales de sitios web. |
| `engineering-universal-document-compiler` | Universal Document Compiler | Compilador de documentos independiente del formato: árboles de documento, diagramación automática y publicación paginada. |
| `engineering-video-streaming-engineer` | Video Streaming Engineer | Streaming de video: HLS/DASH, transcodificación con ffmpeg, baja latencia, DRM, CDN y ajuste del reproductor. |
| `engineering-voice-ai-integration-engineer` | Voice AI Integration Engineer | Transcripción de voz con Whisper y servicios en la nube: limpieza de audio, subtítulos, identificación de hablantes e integración. |
| `engineering-wechat-mini-program-developer` | WeChat Mini Program Developer | Mini programas de WeChat: WXML/WXSS, APIs de WeChat, pagos y mensajes de suscripción. |
| `engineering-webassembly-engineer` | WebAssembly Engineer | WebAssembly: compilar Rust/C++/Go a Wasm, interoperar con JavaScript, WASI, runtimes de servidor y rendimiento casi nativo. |
| `engineering-wordpress-performance` | WordPress Performance Engineer | Rendimiento de WordPress: Core Web Vitals, cachés, consultas, imágenes, CDN y auditoría de plugins. |
| `engineering-wordpress-shopping-cart` | WordPress Shopping Cart Engineer | Tiendas con WooCommerce: catálogo, pasarelas de pago, checkout, pedidos, impuestos y cupones. |

### Testing y QA (9)

| id | Nombre | Descripción |
|---|---|---|
| `testing-api-tester` | API Tester | Pruebas de APIs: validación completa, rendimiento y control de calidad, incluidas integraciones de terceros. |
| `testing-accessibility-auditor` | Accessibility Auditor | Auditor de accesibilidad: revisa interfaces contra WCAG y las prueba con tecnologías de asistencia como lectores de pantalla. |
| `testing-evidence-collector` | Evidence Collector | QA basado en evidencia: reporta problemas reproducibles con capturas y declara con honestidad lo que no probó. |
| `testing-performance-benchmarker` | Performance Benchmarker | Pruebas de rendimiento: mide, analiza y mejora el desempeño de aplicaciones e infraestructura. |
| `testing-reality-checker` | Reality Checker | Frena aprobaciones optimistas: por defecto dice "falta trabajo" y exige pruebas contundentes antes de dar algo por listo. |
| `testing-test-automation-engineer` | Test Automation Engineer | Pruebas end-to-end automatizadas con Playwright y Cypress: selectores robustos, eliminar pruebas inestables y paralelizar en CI. |
| `testing-test-results-analyzer` | Test Results Analyzer | Analiza resultados de pruebas: métricas de calidad y conclusiones accionables. |
| `testing-tool-evaluator` | Tool Evaluator | Evalúa, prueba y recomienda herramientas, software y plataformas para el negocio. |
| `testing-workflow-optimizer` | Workflow Optimizer | Analiza, optimiza y automatiza procesos de trabajo de cualquier área para ganar productividad. |

### Diseño (10)

| id | Nombre | Descripción |
|---|---|---|
| `design-brand-guardian` | Brand Guardian | Guardián de marca: desarrolla la identidad, la mantiene consistente y define su posicionamiento. |
| `design-image-prompt-engineer` | Image Prompt Engineer | Escribe prompts detallados para generar fotografías de calidad profesional con IA. |
| `design-inclusive-visuals-specialist` | Inclusive Visuals Specialist | Corrige los sesgos de la IA al generar imágenes y video, para lograr representaciones culturalmente precisas y sin estereotipos. |
| `design-persona-walkthrough` | Persona Walkthrough Specialist | Simula cómo un tipo de usuario recorre una página web (reacciones y razonamiento en cada tramo) y entrega un informe de conversión. |
| `design-ui-designer` | UI Designer | Diseñador de interfaces: sistemas de diseño visual, librerías de componentes e interfaces consistentes y accesibles. |
| `design-ui-finish-gate-reviewer` | UI Finish-Gate Reviewer | Revisa interfaces antes de publicarlas para atajar diseños genéricos, basándose en evidencia del producto y un contrato de diseño. |
| `design-ux-architect` | UX Architect | Arquitectura técnica de UX: bases sólidas, sistemas de CSS y guías claras de implementación para desarrolladores. |
| `design-ux-researcher` | UX Researcher | Investigación de usuarios: análisis de comportamiento, pruebas de usabilidad y hallazgos que mejoran el producto. |
| `design-visual-storyteller` | Visual Storyteller | Narrativa visual: convierte información compleja en historias visuales y multimedia atractivas. |
| `design-whimsy-injector` | Whimsy Injector | Agrega personalidad y detalles lúdicos a la experiencia para que sea memorable. |

### Seguridad (12)

| id | Nombre | Descripción |
|---|---|---|
| `security-ai-generated-code-auditor` | AI-Generated Code Security Auditor | Audita apps hechas con asistentes de IA: busca secretos expuestos, permisos por fila mal configurados e inyección de prompts; escanea, corrige y vuelve a escanear. |
| `security-appsec-engineer` | Application Security Engineer | Seguridad de aplicaciones: modelado de amenazas, revisión de código seguro, análisis SAST/DAST y formación del equipo. |
| `security-blockchain-security-auditor` | Blockchain Security Auditor | Auditoría de contratos inteligentes: vulnerabilidades, verificación formal, análisis de exploits e informes para protocolos DeFi. |
| `security-cloud-security-architect` | Cloud Security Architect | Seguridad en la nube: arquitecturas de confianza cero, defensa en profundidad en AWS/Azure/GCP e infraestructura como código segura. |
| `security-compliance-auditor` | Compliance Auditor | Auditoría de cumplimiento técnico (SOC 2, ISO 27001, HIPAA, PCI-DSS): desde la preparación hasta la certificación. |
| `security-incident-responder` | Incident Responder | Respuesta a incidentes y forense digital: investiga brechas, contiene amenazas, coordina la crisis y escribe el post-mortem. |
| `security-penetration-tester` | Penetration Tester | Pruebas de penetración autorizadas: red team y evaluación de vulnerabilidades en redes, aplicaciones web y nube. |
| `security-secrets-credential-engineer` | Secrets & Credential Hygiene Engineer | Ciclo de vida de secretos y credenciales: detección, prevención, bóvedas, rotación y respuesta a filtraciones. |
| `security-architect` | Security Architect | Arquitecto de seguridad: modelado de amenazas, diseño seguro, límites de confianza y revisiones basadas en riesgo. |
| `security-senior-secops` | Senior SecOps Engineer | Seguridad defensiva: revisa cada cambio buscando secretos expuestos y luego audita autenticación, tokens, cookies, cabeceras, CORS, límites de uso y CSP. |
| `security-threat-detection-engineer` | Threat Detection Engineer | Detección de amenazas: reglas SIEM, cobertura MITRE ATT&CK, búsqueda proactiva y ajuste de alertas. |
| `security-threat-intelligence-analyst` | Threat Intelligence Analyst | Inteligencia de amenazas: sigue grupos atacantes, mapea campañas a MITRE ATT&CK y produce informes y reglas de detección. |

### Producto (6)

| id | Nombre | Descripción |
|---|---|---|
| `product-behavioral-nudge-engine` | Behavioral Nudge Engine | Psicología del comportamiento aplicada al software: adapta el ritmo y estilo de la interacción para motivar al usuario. |
| `product-dx-engineer` | DX Engineer | Experiencia del desarrollador: elimina pasos innecesarios hasta el primer éxito (ejemplos, onboarding, mensajes de error). |
| `product-feedback-synthesizer` | Feedback Synthesizer | Reúne y analiza comentarios de usuarios de varios canales y los convierte en prioridades de producto. |
| `product-manager` | Product Manager | Product manager: todo el ciclo del producto, desde el descubrimiento y la estrategia hasta la hoja de ruta, el lanzamiento y la medición. |
| `product-sprint-prioritizer` | Sprint Prioritizer | Planificación ágil de sprints: prioriza funcionalidades y reparte recursos para maximizar valor. |
| `product-trend-researcher` | Trend Researcher | Inteligencia de mercado: detecta tendencias, analiza a la competencia y evalúa oportunidades. |

### Gestión de proyectos (7)

| id | Nombre | Descripción |
|---|---|---|
| `project-management-experiment-tracker` | Experiment Tracker | Gestiona experimentos y pruebas A/B: diseño, seguimiento y decisiones basadas en datos. |
| `project-management-jira-workflow-steward` | Jira Workflow Steward | Enlaza Git con Jira: commits trazables, pull requests ordenados y ramas seguras para publicar. |
| `project-management-meeting-notes-specialist` | Meeting Notes Specialist | Convierte transcripciones o notas de reuniones en un resumen con decisiones, tareas y preguntas abiertas. |
| `project-management-project-shepherd` | Project Shepherd | Coordina proyectos entre áreas: plazos, recursos, riesgos y comunicación hasta terminar. |
| `project-manager-senior` | Senior Project Manager | Convierte especificaciones en tareas con alcance realista y recuerda proyectos anteriores. |
| `project-management-studio-operations` | Studio Operations | Operaciones del día a día de un estudio: eficiencia, procesos y coordinación de recursos. |
| `project-management-studio-producer` | Studio Producer | Productor ejecutivo: orquesta proyectos creativos y técnicos, reparte recursos y alinea la visión con el negocio. |

### Soporte y operaciones (6)

| id | Nombre | Descripción |
|---|---|---|
| `support-analytics-reporter` | Analytics Reporter | Analista de datos: paneles, análisis estadístico, KPIs y apoyo a decisiones. |
| `support-executive-summary-generator` | Executive Summary Generator | Resúmenes ejecutivos al estilo consultora (McKinsey, BCG, Bain) para la alta dirección. |
| `support-finance-tracker` | Finance Tracker | Control financiero: presupuestos, flujo de caja y análisis del desempeño del negocio. |
| `support-infrastructure-maintainer` | Infrastructure Maintainer | Mantenimiento de infraestructura: confiabilidad, rendimiento, seguridad y costos de los sistemas. |
| `support-legal-compliance-checker` | Legal Compliance Checker | Verifica que operaciones, manejo de datos y contenidos cumplan leyes y normas de distintas jurisdicciones. |
| `support-support-responder` | Support Responder | Soporte al cliente multicanal: resuelve problemas y convierte cada contacto en una buena experiencia. |

### Marketing (37)

| id | Nombre | Descripción |
|---|---|---|
| `marketing-aeo-foundations` | AEO Foundations Architect | Prepara un sitio para buscadores de IA: llms.txt, robots.txt para IA, contenido en Markdown y archivos de descubrimiento para agentes. |
| `marketing-ai-citation-strategist` | AI Citation Strategist | Mide si ChatGPT, Claude, Gemini y Perplexity citan tu marca, explica por qué citan a la competencia y propone cambios de contenido. |
| `marketing-agentic-search-optimizer` | Agentic Search Optimizer | Revisa si los agentes de IA pueden completar tareas en tu sitio (comprar, reservar, registrarse) e implementa WebMCP. |
| `marketing-app-store-optimizer` | App Store Optimizer | Optimización para tiendas de apps (ASO): visibilidad, conversión y descubrimiento. |
| `marketing-baidu-seo-specialist` | Baidu SEO Specialist | SEO para Baidu, el buscador chino: palabras clave en chino, ecosistema Baidu, licencia ICP e indexación móvil. |
| `marketing-bilibili-content-strategist` | Bilibili Content Strategist | Marketing en Bilibili (China): crecimiento de creadores, cultura de comentarios en pantalla, algoritmo y contenido de marca. |
| `marketing-book-co-author` | Book Co-Author | Coautor de libros de liderazgo de opinión: convierte notas de voz e ideas sueltas en capítulos en primera persona. |
| `marketing-carousel-growth-engine` | Carousel Growth Engine | Genera y publica carruseles para TikTok e Instagram a partir de un sitio web, mide resultados y mejora en cada ciclo. |
| `marketing-china-ecommerce-operator` | China E-Commerce Operator | Comercio electrónico en China (Taobao, Tmall, Pinduoduo, JD): fichas de producto, ventas en vivo y campañas como 618 y 11.11. |
| `marketing-china-market-localization-strategist` | China Market Localization Strategist | Convierte tendencias del mercado chino en estrategias de entrada en Douyin, Xiaohongshu, WeChat y Bilibili. |
| `marketing-content-creator` | Content Creator | Estratega de contenidos multiplataforma: calendario editorial, textos, relato de marca y optimización para engagement. |
| `marketing-cross-border-ecommerce` | Cross-Border E-Commerce Specialist | Comercio electrónico internacional (Amazon, Shopee, Temu, TikTok Shop): logística, impuestos, fichas multiidioma y tienda propia. |
| `marketing-developer-community-builder` | Developer Community Builder | Hace crecer comunidades de desarrolladores (Discord, GitHub, foros) y convierte usuarios en contribuidores. |
| `marketing-douyin-strategist` | Douyin Strategist | Videos cortos en Douyin (TikTok chino): algoritmo, videos virales, ventas en vivo y crecimiento de marca. |
| `marketing-email-strategist` | Email Marketing Strategist | Email marketing: campañas desde el CRM, automatizaciones por etapa del cliente, segmentación y entregabilidad. |
| `marketing-global-podcast-strategist` | Global Podcast Strategist | Hace crecer podcasts: posicionamiento, audiencia, contenido y monetización en Spotify, Apple Podcasts y YouTube. |
| `marketing-growth-hacker` | Growth Hacker | Growth hacking: adquisición rápida de usuarios con experimentos, bucles virales y optimización de embudos. |
| `marketing-instagram-curator` | Instagram Curator | Marketing en Instagram: narrativa visual, comunidad y contenido en todos sus formatos. |
| `marketing-kuaishou-strategist` | Kuaishou Strategist | Marketing en Kuaishou (China): videos cortos para ciudades pequeñas, ventas en vivo y comunidad. |
| `marketing-linkedin-content-creator` | LinkedIn Content Creator | Contenido para LinkedIn: liderazgo de opinión, marca personal y publicaciones que generan oportunidades. |
| `marketing-livestream-commerce-coach` | Livestream Commerce Coach | Entrena a presentadores de ventas en vivo (Douyin, Kuaishou, Taobao Live): guiones, orden de productos y cierre de ventas. |
| `marketing-multi-platform-publisher` | Multi-Platform Publisher | Publica un artículo en varias plataformas chinas adaptándolo a cada una; siempre deja borradores para revisión humana. |
| `marketing-pr-communications-manager` | PR & Communications Manager | Relaciones públicas: prensa, comunicados, comunicación de crisis y reputación de marca. |
| `marketing-podcast-strategist` | Podcast Strategist | Podcasts en el mercado chino (Xiaoyuzhou, Ximalaya): posicionamiento, producción, audiencia y monetización. |
| `marketing-private-domain-operator` | Private Domain Operator | Ecosistemas propios en WeChat empresarial (WeCom): CRM social, comunidades segmentadas, mini programas y conversión. |
| `marketing-reddit-community-builder` | Reddit Community Builder | Marketing en Reddit: participación auténtica en comunidades, contenido de valor y relaciones de largo plazo. |
| `marketing-seo-specialist` | SEO Specialist | SEO: técnico, optimización de contenido, autoridad de enlaces y crecimiento del tráfico orgánico. |
| `marketing-short-video-editing-coach` | Short-Video Editing Coach | Enseña a editar videos cortos (CapCut, Premiere, DaVinci, Final Cut): encuadre, color, audio, efectos, subtítulos y exportación. |
| `marketing-social-media-strategist` | Social Media Strategist | Redes sociales profesionales (LinkedIn, Twitter): campañas cruzadas, comunidad y liderazgo de opinión. |
| `marketing-tiktok-strategist` | TikTok Strategist | Marketing en TikTok: contenido viral, algoritmo y comunidad. |
| `marketing-twitter-engager` | Twitter Engager | Twitter/X: participación en tiempo real, liderazgo de opinión e hilos virales. |
| `marketing-video-optimization-specialist` | Video Optimization Specialist | Video en YouTube: algoritmo, retención de audiencia, capítulos, miniaturas y distribución en otras plataformas. |
| `marketing-wechat-official-account` | WeChat Official Account Manager | Cuentas oficiales de WeChat: contenido, suscriptores y conversión. |
| `marketing-weibo-strategist` | Weibo Strategist | Weibo (China): temas en tendencia, comunidades, monitoreo de opinión pública, fans y publicidad. |
| `marketing-x-twitter-intelligence-analyst` | X/Twitter Intelligence Analyst | Investigación en X/Twitter: detección de tendencias, monitoreo de cuentas y análisis de audiencia con datos públicos. |
| `marketing-xiaohongshu-specialist` | Xiaohongshu Specialist | Marketing en Xiaohongshu (China): contenido de estilo de vida, tendencias y comunidad. |
| `marketing-zhihu-strategist` | Zhihu Strategist | Marketing en Zhihu (China): liderazgo de opinión respondiendo preguntas y credibilidad en la comunidad. |

### Publicidad pagada (7)

| id | Nombre | Descripción |
|---|---|---|
| `paid-media-creative-strategist` | Ad Creative Strategist | Creatividad publicitaria: textos de anuncios, activos y pruebas creativas en Google, Meta y Microsoft. |
| `paid-media-ppc-strategist` | PPC Campaign Strategist | Campañas de búsqueda pagada a gran escala (Google, Microsoft, Amazon): estructura de cuentas, presupuestos y pujas. |
| `paid-media-auditor` | Paid Media Auditor | Auditoría completa de cuentas de Google Ads, Microsoft Ads y Meta, con recomendaciones priorizadas. |
| `paid-media-paid-social-strategist` | Paid Social Strategist | Publicidad pagada en redes sociales (Meta, LinkedIn, TikTok, Pinterest, X, Snapchat), del primer contacto al retargeting. |
| `paid-media-programmatic-buyer` | Programmatic & Display Buyer | Compra programática y publicidad display: Google Display, DV360, medios de socios y campañas ABM. |
| `paid-media-search-query-analyst` | Search Query Analyst | Analiza términos de búsqueda, arma listas de palabras negativas y elimina gasto inútil en búsqueda pagada. |
| `paid-media-tracking-specialist` | Tracking & Measurement Specialist | Medición de conversiones: Google Tag Manager, GA4, Google Ads, Meta CAPI, LinkedIn y seguimiento del lado del servidor. |

### Ventas (9)

| id | Nombre | Descripción |
|---|---|---|
| `sales-account-strategist` | Account Strategist | Gestión de cuentas después de la venta: expansión, mapa de interlocutores, revisiones trimestrales y retención de ingresos. |
| `sales-deal-strategist` | Deal Strategist | Estrategia de negocios B2B complejos: calificación MEDDPICC, posicionamiento frente a la competencia y planes para ganar. |
| `sales-discovery-coach` | Discovery Coach | Entrena a vendedores en reuniones de descubrimiento: preguntas, situación actual, brechas y motivación real de compra. |
| `sales-offer-lead-gen-strategist` | Offer & Lead Gen Strategist | Diseña ofertas irresistibles e imanes de prospectos para atraer compradores calificados a escala. |
| `sales-outbound-strategist` | Outbound Strategist | Prospección saliente basada en señales: secuencias multicanal, perfil de cliente ideal y personalización. |
| `sales-pipeline-analyst` | Pipeline Analyst | Analiza el pipeline de ventas: salud, velocidad de cierre, precisión de pronósticos y coaching basado en datos del CRM. |
| `sales-proposal-strategist` | Proposal Strategist | Convierte licitaciones y oportunidades en propuestas ganadoras: temas, posicionamiento y resumen ejecutivo. |
| `sales-coach` | Sales Coach | Coach de ventas: desarrolla a los vendedores, revisa el pipeline, analiza llamadas y mejora los pronósticos. |
| `sales-engineer` | Sales Engineer | Preventa técnica: descubrimiento, demos, pruebas de concepto y comparativas con la competencia. |

### Finanzas (5)

| id | Nombre | Descripción |
|---|---|---|
| `finance-bookkeeper-controller` | Bookkeeper & Controller | Contabilidad diaria y control: conciliaciones, cierre de mes, controles internos y preparación para auditorías. |
| `finance-fpa-analyst` | FP&A Analyst | Planificación financiera (FP&A): presupuestos, análisis de desviaciones y pronósticos continuos. |
| `finance-financial-analyst` | Financial Analyst | Análisis financiero: modelos, pronósticos, escenarios y apoyo a decisiones. |
| `finance-investment-researcher` | Investment Researcher | Investigación de inversiones: estudio de mercado, due diligence, análisis de carteras y valorización de activos. |
| `finance-tax-strategist` | Tax Strategist | Estrategia tributaria: optimización de impuestos, cumplimiento en varias jurisdicciones y precios de transferencia. |

### Académicos (6)

| id | Nombre | Descripción |
|---|---|---|
| `academic-anthropologist` | Anthropologist | Antropología: sistemas culturales, rituales, parentesco y creencias para crear sociedades verosímiles. |
| `academic-geographer` | Geographer | Geografía física y humana, clima y cartografía para que un mundo tenga sentido científico. |
| `academic-historian` | Historian | Historia: análisis, periodización, cultura material y detalles de época basados en fuentes. |
| `academic-narratologist` | Narratologist | Teoría narrativa: estructura del relato, arcos de personajes y análisis literario. |
| `academic-psychologist` | Psychologist | Psicología: comportamiento, personalidad, motivación y patrones cognitivos para personajes creíbles. |
| `academic-statistician` | Statistician | Estadística: metodología cuantitativa, diseño experimental e inferencia; separa la señal real del ruido y el sesgo. |

### Investigación (1)

| id | Nombre | Descripción |
|---|---|---|
| `research-synthesist` | Research Synthesist | Revisa literatura, evalúa fuentes y sintetiza qué respalda realmente la evidencia. |

### Salud (3)

| id | Nombre | Descripción |
|---|---|---|
| `healthcare-clinical-evidence-agent` | Clinical Evidence Agent | Estándares de evidencia clínica para agentes de IA en salud: distingue afirmaciones validadas de las que no lo están. |
| `healthcare-innovation-strategist` | Healthcare Innovation Strategist | Relato estratégico para fundadores en salud: coherencia ante inversionistas, reguladores, gobiernos y médicos. |
| `healthcare-sovereign-health-systems-agent` | Sovereign Health Systems Agent | Relación con ministerios de salud y políticas de cobertura universal para lanzar tecnología sanitaria en mercados regulados y emergentes. |

### GIS y mapas (13)

| id | Nombre | Descripción |
|---|---|---|
| `gis-3d-scene-developer` | 3D & Scene Developer | Escenas 3D web: modelos de terreno, nubes de puntos y experiencias interactivas con Cesium y ArcGIS. |
| `gis-bim-specialist` | BIM/GIS Specialist | Integra modelos de edificios (BIM) con sistemas geográficos (GIS): Revit/IFC, mapas de interiores y gemelos digitales. |
| `gis-cartography-designer` | Cartography Designer | Diseño de mapas: color, tipografía, etiquetas, mapas base y jerarquía visual, para impresión y web. |
| `gis-drone-reality-mapping` | Drone/Reality Mapping Specialist | Fotogrametría con drones: ortomosaicos, modelos de terreno, nubes de puntos y mallas 3D. |
| `gis-analyst` | GIS Analyst | Analista GIS: mapas, capas, consultas espaciales e integridad de datos geográficos. |
| `gis-qa-engineer` | GIS QA Engineer | Control de calidad de datos geográficos: topología, metadatos, sistemas de coordenadas y precisión. |
| `gis-geoai-ml-engineer` | GeoAI/ML Engineer | Machine learning sobre imágenes satelitales y aéreas: detección de objetos, segmentación y clasificación de suelo. |
| `gis-geoprocessing-specialist` | Geoprocessing Specialist | Automatiza flujos geoespaciales en ArcGIS Pro con ArcPy, toolboxes de Python y Model Builder. |
| `gis-solution-engineer` | Solution Engineer | Construye prototipos y demos GIS funcionales con Esri y herramientas de código abierto. |
| `gis-spatial-data-engineer` | Spatial Data Engineer | ETL de datos geográficos: conversión de formatos, reproyección, normalización y pipelines automáticos. |
| `gis-spatial-data-scientist` | Spatial Data Scientist | Análisis espacial avanzado: modelos estadísticos, econometría espacial, clustering y predicción. |
| `gis-technical-consultant` | Technical Consultant | Asesor GIS: traduce problemas de negocio a soluciones geoespaciales, hojas de ruta y respuestas a licitaciones. |
| `gis-web-gis-developer` | Web GIS Developer | Aplicaciones de mapas web interactivas con MapLibre, ArcGIS JS y Leaflet, paneles en tiempo real y servicios geoespaciales. |

### Desarrollo de videojuegos (21)

| id | Nombre | Descripción |
|---|---|---|
| `blender-addon-engineer` | Blender Add-on Engineer | Add-ons de Blender en Python: validadores, exportadores y automatizaciones del pipeline 3D. |
| `economy-designer` | Economy Designer | Economías de videojuegos: monedas, entradas y salidas de recursos, monetización e inflación. |
| `game-audio-engineer` | Game Audio Engineer | Audio interactivo para juegos: FMOD/Wwise, música adaptativa, audio espacial y rendimiento. |
| `game-designer` | Game Designer | Diseño de juegos: documento de diseño, mecánicas, psicología del jugador, economía y ciclos de juego. |
| `godot-gameplay-scripter` | Godot Gameplay Scripter | Programación de jugabilidad en Godot 4 con GDScript y C#, arquitectura por nodos y señales. |
| `godot-multiplayer-engineer` | Godot Multiplayer Engineer | Multijugador en Godot 4: replicación de escenas, ENet/WebRTC, RPCs y autoridad. |
| `godot-shader-developer` | Godot Shader Developer | Efectos visuales en Godot 4: shaders, VisualShader, posprocesado y rendimiento 2D/3D. |
| `level-designer` | Level Designer | Diseño de niveles: distribución del espacio, ritmo, encuentros y narrativa del entorno. |
| `narrative-designer` | Narrative Designer | Narrativa de videojuegos: diálogos ramificados, lore y narrativa del entorno. |
| `roblox-avatar-creator` | Roblox Avatar Creator | Avatares y contenido de usuarios (UGC) en Roblox: creación de accesorios, rigging, texturas y publicación en el marketplace. |
| `roblox-experience-designer` | Roblox Experience Designer | Experiencias en Roblox: ciclos de enganche, progresión, monetización y retención de jugadores. |
| `roblox-systems-scripter` | Roblox Systems Scripter | Programación en Roblox con Luau: seguridad cliente-servidor, RemoteEvents, DataStore y módulos. |
| `technical-artist` | Technical Artist | Artista técnico: shaders, efectos visuales, niveles de detalle y optimización de assets entre motores. |
| `unity-architect` | Unity Architect | Arquitectura en Unity: ScriptableObjects, sistemas desacoplados y componentes de responsabilidad única. |
| `unity-editor-tool-developer` | Unity Editor Tool Developer | Herramientas para el editor de Unity: ventanas personalizadas, importadores y automatización del pipeline. |
| `unity-multiplayer-engineer` | Unity Multiplayer Engineer | Multijugador en Unity: Netcode for GameObjects, Relay/Lobby, autoridad del servidor y compensación de latencia. |
| `unity-shader-graph-artist` | Unity Shader Graph Artist | Efectos y materiales en Unity: Shader Graph, HLSL y pipelines URP/HDRP. |
| `unreal-multiplayer-architect` | Unreal Multiplayer Architect | Multijugador en Unreal Engine 5: replicación, GameMode/GameState, predicción y servidores dedicados. |
| `unreal-systems-engineer` | Unreal Systems Engineer | Sistemas en Unreal Engine 5: C++ y Blueprints, Nanite, Lumen y Gameplay Ability System. |
| `unreal-technical-artist` | Unreal Technical Artist | Pipeline visual de Unreal Engine 5: materiales, efectos Niagara y generación procedural. |
| `unreal-world-builder` | Unreal World Builder | Mundos abiertos en Unreal Engine 5: World Partition, terrenos, vegetación procedural y carga por zonas. |

### Computación espacial (XR) (6)

| id | Nombre | Descripción |
|---|---|---|
| `terminal-integration-specialist` | Terminal Integration Specialist | Emulación de terminal y renderizado de texto en apps Swift con SwiftTerm. |
| `xr-cockpit-interaction-specialist` | XR Cockpit Interaction Specialist | Diseña y desarrolla controles de cabina inmersivos para entornos de realidad extendida (XR). |
| `xr-immersive-developer` | XR Immersive Developer | Desarrollo de realidad aumentada y virtual en el navegador con WebXR. |
| `xr-interface-architect` | XR Interface Architect | Diseño de interacción e interfaces para realidad aumentada, virtual y mixta. |
| `macos-spatial-metal-engineer` | macOS Spatial/Metal Engineer | Swift y Metal nativos: renderizado 3D de alto rendimiento para macOS y Vision Pro. |
| `visionos-spatial-engineer` | visionOS Spatial Engineer | Desarrollo nativo para visionOS (Apple Vision Pro): interfaces volumétricas con SwiftUI y diseño Liquid Glass. |

### Especializados (varios) (59)

| id | Nombre | Descripción |
|---|---|---|
| `accounts-payable-agent` | Accounts Payable Agent | Procesa pagos a proveedores, contratistas y cuentas recurrentes por cualquier medio (cripto, dinero tradicional, stablecoins). |
| `agentic-identity-trust` | Agentic Identity & Trust Architect | Identidad y confianza para agentes de IA autónomos: demostrar quiénes son, qué pueden hacer y qué hicieron. |
| `agents-orchestrator` | Agents Orchestrator | Coordina de forma autónoma todo el flujo de desarrollo, dirigiendo a los demás agentes. |
| `healthcare-aging-parent-care-companion` | Aging Parent Care Companion | Apoya a familiares que cuidan a un padre o madre mayor: citas médicas, remedios, equipo de salud y el bienestar del cuidador. |
| `automation-governance-architect` | Automation Governance Architect | Evalúa valor, riesgo y mantenibilidad de automatizaciones de negocio (sobre todo n8n) antes de construirlas. |
| `business-strategist` | Business Strategist | Consultor de estrategia: análisis competitivo, entrada a mercados, modelo de negocio y planes de crecimiento. |
| `change-management-consultant` | Change Management Consultant | Gestión del cambio (ADKAR, Kotter, Prosci) en implementaciones tecnológicas, reestructuraciones y fusiones. |
| `chief-financial-officer` | Chief Financial Officer | Gerente de finanzas (CFO): asignación de capital, tesorería, planificación, fusiones, inversionistas y directorio. |
| `specialized-chief-of-staff` | Chief of Staff | Jefe de gabinete para fundadores y ejecutivos: filtra el ruido, ordena procesos y enruta decisiones. |
| `specialized-civil-engineer` | Civil Engineer | Ingeniería civil y estructural con normas internacionales: cálculo estructural, geotecnia, documentación y cumplimiento de códigos. |
| `specialized-codebase-archaeologist` | Codebase Archaeologist | Revisa código tocado por varias herramientas de IA a lo largo del tiempo y encuentra contradicciones, código muerto y documentación desactualizada. |
| `corporate-training-designer` | Corporate Training Designer | Diseña programas de capacitación corporativa: diagnóstico de necesidades, diseño instruccional, formación de líderes y evaluación. |
| `specialized-cultural-intelligence-strategist` | Cultural Intelligence Strategist | Detecta exclusiones invisibles y adapta el software para que funcione bien en distintas culturas e identidades. |
| `customer-service` | Customer Service | Atención al cliente para cualquier industria: consultas, reclamos, cuentas, preguntas frecuentes y derivaciones. |
| `customer-success-manager` | Customer Success Manager | Éxito del cliente: onboarding, salud de las cuentas, revisiones trimestrales, prevención de bajas y renovaciones. |
| `data-consolidation-agent` | Data Consolidation Agent | Consolida datos de ventas en paneles en vivo con resúmenes por territorio, vendedor y pipeline. |
| `data-privacy-officer` | Data Privacy Officer | Delegado de protección de datos: programas de cumplimiento GDPR/CCPA, evaluaciones de impacto, consentimiento y brechas. |
| `specialized-developer-advocate` | Developer Advocate | Developer advocate: comunidades de desarrolladores, contenido técnico y experiencia del desarrollador para impulsar la adopción. |
| `specialized-document-generator` | Document Generator | Genera documentos profesionales en PDF, PPTX, DOCX y XLSX con código, incluidos gráficos. |
| `esg-sustainability-officer` | ESG & Sustainability Officer | Sostenibilidad y ESG: programas ambientales y sociales, reportes, descarbonización y gobierno corporativo. |
| `specialized-fedramp-rmf-compliance` | FedRAMP & RMF Compliance Engineer | Cumplimiento FedRAMP y NIST RMF para vender servicios en la nube al gobierno de EE.UU. |
| `specialized-focus-music-architect` | Focus Music Architect | Escribe prompts para generar música instrumental de concentración: paisajes sonoros, ritmo y capas binaurales. |
| `specialized-french-consulting-market` | French Consulting Market Navigator | Guía para trabajar como consultor freelance en Francia: márgenes, plataformas, portage salarial, tarifas y plazos de pago. |
| `government-digital-presales-consultant` | Government Digital Presales Consultant | Preventa de proyectos de TI para el gobierno chino: interpretación de políticas, diseño de soluciones, licitaciones y cumplimiento. |
| `grant-writer` | Grant Writer | Redacción de postulaciones a fondos para ONGs e instituciones: búsqueda de fondos, propuestas, presupuestos y reportes. |
| `hr-onboarding` | HR Onboarding | Incorporación de personal: orientación, documentos, cumplimiento, beneficios e integración cultural. |
| `healthcare-customer-service` | Healthcare Customer Service | Atención a pacientes: facturación, citas, seguros, reclamos y derivación al personal clínico o administrativo. |
| `healthcare-marketing-compliance` | Healthcare Marketing Compliance Specialist | Cumplimiento de la normativa china de publicidad en salud: medicamentos, dispositivos médicos, estética y suplementos. |
| `hospitality-guest-services` | Hospitality Guest Services | Atención a huéspedes en hoteles, restaurantes y eventos: reservas, check-in/check-out, conserjería, reclamos y fidelización. |
| `identity-graph-operator` | Identity Graph Operator | Mantiene un grafo de identidad compartido para que todos los agentes de un sistema resuelvan igual "quién es esta entidad". |
| `specialized-korean-business-navigator` | Korean Business Navigator | Cultura de negocios coreana para extranjeros: toma de decisiones, jerarquías, etiqueta en KakaoTalk y relaciones. |
| `lsp-index-engineer` | LSP/Index Engineer | Language Server Protocol: inteligencia de código unificada orquestando clientes LSP e indexación semántica. |
| `language-translator` | Language Translator | Traductor español ↔ inglés en tiempo real, con contexto cultural, variantes regionales y tono adecuado. |
| `legal-billing-time-tracking` | Legal Billing & Time Tracking | Facturación legal: registro de horas, emisión de facturas, cobranza y cumplimiento de cuentas fiduciarias. |
| `legal-client-intake` | Legal Client Intake | Recepción de clientes en estudios jurídicos: calificación, datos del caso, agenda, conflictos de interés y resumen para el abogado. |
| `legal-document-review` | Legal Document Review | Revisión de documentos legales: resume contratos, marca cláusulas riesgosas, compara versiones y verifica cumplimiento. |
| `loan-officer-assistant` | Loan Officer Assistant | Asistente de créditos e hipotecas: datos del solicitante, precalificación, documentos, pipeline, cumplimiento y cierre. |
| `ma-integration-manager` | M&A Integration Manager | Integración post-fusión: preparación del primer día, plan de 100 días, sinergias, cultura y acuerdos de transición. |
| `specialized-mcp-builder` | MCP Builder | Diseña, construye y prueba servidores MCP que agregan herramientas y recursos a agentes de IA. |
| `specialized-master-plan-architect` | Master Plan Architect | Planificación y crítica de planes: enseña arquitectura, identifica riesgos y escribe planes de implementación en Markdown sin ejecutar código. |
| `medical-billing-coding-specialist` | Medical Billing & Coding Specialist | Codificación y facturación médica (CIE-10, CPT, HCPCS): reclamos, rechazos, ciclo de ingresos y auditorías. |
| `specialized-model-qa` | Model QA Specialist | Auditoría independiente de modelos estadísticos y de ML: documentación, replicación, calibración, interpretabilidad y monitoreo. |
| `operations-manager` | Operations Manager | Operaciones de negocio con Lean y Six Sigma: mapeo de procesos, capacidad, KPIs y proveedores. |
| `organizational-psychologist` | Organizational Psychologist | Psicología organizacional: dinámica de equipos, seguridad psicológica, riesgo de burnout y salud de la cultura. |
| `personal-growth-mentor` | Personal Growth Mentor | Mentor de desarrollo personal: claridad de metas, hábitos, decisiones y seguimiento, sin frases motivacionales vacías. |
| `specialized-pricing-analyst` | Pricing Analyst | Fijación de precios: investigación de mercado, competencia, estructura de costos y márgenes. |
| `real-estate-buyer-seller` | Real Estate Buyer & Seller | Asistente de corretaje inmobiliario: compradores y vendedores, publicaciones, ofertas, negociación y cierre. |
| `recruitment-specialist` | Recruitment Specialist | Reclutamiento con foco en China: plataformas de empleo, evaluación de talento, legislación laboral y marca empleadora. |
| `report-distribution-agent` | Report Distribution Agent | Distribuye automáticamente reportes de ventas consolidados a cada vendedor según su territorio. |
| `resume-tailor` | Resume Tailor | Adapta tu currículum a una oferta de trabajo: mapea tu experiencia real, mejora palabras clave para ATS y reescribe sin inventar. |
| `retail-customer-returns` | Retail Customer Returns | Devoluciones en retail: cambios y reembolsos en tienda y online, políticas, prevención de fraude y fidelización. |
| `sales-data-extraction-agent` | Sales Data Extraction Agent | Vigila planillas Excel y extrae métricas de ventas (mes, año y cierre anual) para reportes en vivo. |
| `sales-outreach` | Sales Outreach | Prospección B2B consultiva: contacto en frío, seguimiento, objeciones, propuestas y pipeline. |
| `specialized-salesforce-architect` | Salesforce Architect | Arquitectura en Salesforce: diseño multi-nube, integraciones, límites de la plataforma, despliegues y modelo de datos. |
| `specialized-strategy-duel-agent` | Strategy Duel Agent | Duelos de estrategia en vivo usando teoría de juegos y las 36 estratagemas chinas. |
| `study-abroad-advisor` | Study Abroad Advisor | Asesoría para estudiar en el extranjero (EE.UU., Reino Unido, Canadá, Australia, Europa, Asia): postulación, ensayos, exámenes y visas. |
| `supply-chain-strategist` | Supply Chain Strategist | Cadena de suministro y compras: desarrollo de proveedores, abastecimiento, control de calidad y digitalización. |
| `specialized-workflow-architect` | Workflow Architect | Mapea flujos completos de sistemas y usuarios (caminos felices, fallas, recuperación) como especificación lista para construir y probar. |
| `zk-steward` | ZK Steward | Gestiona una base de conocimiento al estilo Zettelkasten: notas atómicas, conexiones entre ellas y descomposición de tareas complejas. |
