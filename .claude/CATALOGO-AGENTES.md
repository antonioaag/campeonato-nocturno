# Catálogo de agentes (The Agency)

282 agentes de [msitarzewski/agency-agents](https://github.com/msitarzewski/agency-agents), agrupados por división. Las descripciones vienen del repo original, en inglés.

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
| `engineering-ai-data-remediation-engineer` | AI Data Remediation Engineer | Specialist in self-healing data pipelines — uses air-gapped local SLMs and semantic clustering to automatically detect, classify, and fix data anomalies at scale.… |
| `engineering-ai-engineer` | AI Engineer | Expert AI/ML engineer specializing in machine learning model development, deployment, and integration into production systems. Focused on building intelligent… |
| `engineering-api-platform-engineer` | API Platform Engineer | Expert API platform engineer for public and partner APIs — contract-first design (OpenAPI/gRPC), versioning and deprecation policy, SDK generation, API gateway… |
| `engineering-ats-validator-architect` | ATS Validator Architect | Architect and validator for Applicant Tracking Systems (ATS) and resume parsers. Combines deterministic information retrieval (BM25/TF-IDF and n-grams without AI),… |
| `engineering-autonomous-optimization-architect` | Autonomous Optimization Architect | Intelligent system governor that continuously shadow-tests APIs for performance while enforcing strict financial and security guardrails against runaway costs. |
| `engineering-backend-architect` | Backend Architect | Senior backend architect specializing in scalable system design, database architecture, API development, and cloud infrastructure. Builds robust, secure, performant… |
| `engineering-cms-developer` | CMS Developer | Drupal and WordPress specialist for theme development, custom plugins/modules, content architecture, and code-first CMS implementation |
| `engineering-china-network-engineer` | China Network Engineer | Expert in mainland China's mainstream enterprise networking stacks — Huawei VRP, H3C Comware, Ruijie RGOS, and Hillstone StoneOS — covering routing, switching,… |
| `engineering-code-reviewer` | Code Reviewer | Expert code reviewer who provides constructive, actionable feedback focused on correctness, maintainability, security, and performance — not style preferences. |
| `engineering-codebase-onboarding-engineer` | Codebase Onboarding Engineer | Expert developer onboarding specialist who helps new engineers understand unfamiliar codebases fast by reading source code, tracing code paths, and stating only facts… |
| `engineering-data-engineer` | Data Engineer | Expert data engineer specializing in building reliable data pipelines, lakehouse architectures, and scalable data infrastructure. Masters ETL/ELT, Apache Spark, dbt,… |
| `engineering-data-visualization-engineer` | Data Visualization Engineer | Expert data visualization engineer — chart-type selection by data and question, perceptually honest encodings, colorblind-safe data palettes, accessible and… |
| `engineering-database-optimizer` | Database Optimizer | Expert database specialist focusing on schema design, query optimization, indexing strategies, and performance tuning for PostgreSQL, MySQL, and modern databases like… |
| `engineering-database-reliability-engineer` | Database Reliability Engineer | Expert database reliability engineer (DBRE) — high availability and replication, automated failover, backup and point-in-time recovery, zero-downtime online schema… |
| `engineering-desktop-app-engineer` | Desktop App Engineer | Expert desktop application engineer for Electron and Tauri — secure IPC and process isolation, code signing and notarization, auto-update pipelines, native OS… |
| `engineering-devops-automator` | DevOps Automator | Expert DevOps engineer specializing in infrastructure automation, CI/CD pipeline development, and cloud operations |
| `engineering-developer-tooling-engineer` | Developer Tooling Engineer | Expert developer-tooling and CLI engineer — building command-line tools and internal developer platforms with great DX: intuitive command design, helpful errors,… |
| `engineering-drupal-performance` | Drupal Performance Engineer | Expert Drupal 10/11 performance engineer specializing in Core Web Vitals, render and dynamic page caching, BigPipe, cache tags and contexts, database query and Views… |
| `engineering-drupal-shopping-cart` | Drupal Shopping Cart Engineer | Expert Drupal e-commerce engineer specializing in Drupal Commerce for product catalog management, payment gateway integration, checkout workflow design, order… |
| `engineering-email-intelligence-engineer` | Email Intelligence Engineer | Expert in extracting structured, reasoning-ready data from raw email threads for AI agents and automation systems |
| `engineering-embedded-firmware-engineer` | Embedded Firmware Engineer | Specialist in bare-metal and RTOS firmware - ESP32/ESP-IDF, PlatformIO, Arduino, ARM Cortex-M, STM32 HAL/LL, Nordic nRF5/nRF Connect SDK, FreeRTOS, Zephyr |
| `engineering-feishu-integration-developer` | Feishu Integration Developer | Full-stack integration expert specializing in the Feishu (Lark) Open Platform — proficient in Feishu bots, mini programs, approval workflows, Bitable… |
| `engineering-filament-optimization-specialist` | Filament Optimization Specialist | Expert in restructuring and optimizing Filament PHP admin interfaces for maximum usability and efficiency. Focuses on impactful structural changes — not just cosmetic… |
| `engineering-finops-engineer` | FinOps Engineer | Expert cloud cost engineer for AWS/GCP/Azure — cost allocation and tagging, rightsizing, commitment planning (reserved instances/savings plans), egress and storage… |
| `engineering-frontend-developer` | Frontend Developer | Expert frontend developer specializing in modern web technologies, React/Vue/Angular frameworks, UI implementation, and performance optimization |
| `engineering-gaussdb-expert` | GaussDB Expert Engineer | Expert database specialist focusing on GaussDB OLTP — Huawei's self-developed enterprise-grade relational database (NOT GaussDB(DWS) OLAP, NOT GaussDB(for openGauss)… |
| `engineering-git-workflow-master` | Git Workflow Master | Expert in Git workflows, branching strategies, and version control best practices including conventional commits, rebasing, worktrees, and CI-friendly branch management. |
| `engineering-it-service-manager` | IT Service Manager | Expert IT service management specialist using ITIL 4 framework for service catalog design, incident and problem management, change control, SLA governance, CMDB… |
| `engineering-identity-access-engineer` | Identity & Access Engineer | Expert identity engineer for OAuth 2.0/OIDC flows, enterprise SSO (SAML/OIDC) and SCIM provisioning, passkeys/WebAuthn, session architecture, and multi-tenant… |
| `engineering-incident-response-commander` | Incident Response Commander | Expert incident commander specializing in production incident management, structured response coordination, post-mortem facilitation, SLO/SLI tracking, and on-call… |
| `engineering-i18n-engineer` | Internationalization Engineer | Expert i18n engineer for ICU MessageFormat, CLDR plural rules, RTL and bidirectional layouts, locale-aware date/number/currency formatting, string extraction… |
| `engineering-iot-fleet-engineer` | IoT Fleet Engineer | Expert IoT and edge fleet engineer — device provisioning and identity, MQTT/telemetry pipelines, staged over-the-air (OTA) firmware updates with rollback, edge… |
| `engineering-knowledge-graph-engineer` | Knowledge Graph Engineer | Structures information and capabilities into interconnected nodes (entities) and edges (relationships) — enabling dynamic context navigation, modular competency… |
| `engineering-llm-post-training-engineer` | LLM Post-Training Engineer | Evidence-driven owner for SFT, preference optimization, RLHF/RLVR, MoE post-training, and the release gates that turn a checkpoint into a defensible model change. |
| `engineering-minimal-change-engineer` | Minimal Change Engineer | Engineering specialist focused on minimum-viable diffs — fixes only what was asked, refuses scope creep, prefers three similar lines over a premature abstraction. The… |
| `engineering-mobile-app-builder` | Mobile App Builder | Specialized mobile application developer with expertise in native iOS/Android development and cross-platform frameworks |
| `engineering-mobile-release-engineer` | Mobile Release Engineer | Expert mobile release and distribution engineer for iOS and Android — code signing, provisioning, fastlane pipelines, App Store Connect and Play Console submission,… |
| `engineering-multi-agent-systems-architect` | Multi-Agent Systems Architect | Systems architect specializing in the design, coordination, and governance of multi-agent AI pipelines — covering topology selection, context management, inter-agent… |
| `engineering-network-engineer` | Network Engineer | Expert network engineer for Cisco IOS/IOS-XE, Cisco ASA/FTD, Juniper Junos, and Palo Alto PAN-OS routing, switching, firewalling, and troubleshooting. |
| `engineering-orgscript-engineer` | OrgScript Engineer | Expert in designing, parsing, and implementing OrgScript grammar, AST validation, and business logic definitions. |
| `engineering-pdf-engine-architect` | PDF Engine Architect | Architect and specialist in deterministic HTML-to-PDF document compilation, Playwright browser context pools, dynamic Euclidean page sizing, LayoutNG subpixel… |
| `engineering-payments-billing-engineer` | Payments & Billing Engineer | Expert payments engineer for PSP integrations (Stripe, Adyen, Braintree, PayPal), idempotent payment flows, webhook processing, subscription billing, SCA/3DS, PCI… |
| `engineering-platform-engineer` | Platform Engineer | Expert internal developer platform (IDP) engineer specializing in golden paths, paved roads, and self-serve infrastructure that multiplies engineering velocity. |
| `engineering-privacy-engineer` | Privacy Engineer | Expert privacy engineer who implements privacy in code — PII discovery and classification, data minimization, consent enforcement at the API layer, automated DSAR and… |
| `engineering-prompt-engineer` | Prompt Engineer | Specialist in crafting, testing, and systematically optimizing prompts for LLMs — turning vague instructions into reliable, production-grade AI behaviors. |
| `engineering-rag-pipeline-engineer` | RAG Pipeline Engineer | Production RAG specialist focused on chunking strategy, retrieval quality, hybrid search, re-ranking, and eval-driven iteration. Builds pipelines that actually… |
| `engineering-rapid-prototyper` | Rapid Prototyper | Specialized in ultra-fast proof-of-concept development and MVP creation using efficient tools and frameworks |
| `engineering-realtime-collaboration-engineer` | Realtime Collaboration Engineer | Expert realtime systems engineer for WebSocket/SSE infrastructure, presence, CRDT and OT-based collaborative editing, offline-first sync engines, and fan-out scaling… |
| `engineering-rust-refactoring-specialist` | Rust Refactoring Specialist | Expert Rust engineer for repository-scale refactoring, safe renames, module restructuring, duplication removal, panic hardening, ownership improvements, and compiler… |
| `engineering-sre` | SRE (Site Reliability Engineer) | Expert site reliability engineer specializing in SLOs, error budgets, observability, chaos engineering, and toil reduction for production systems at scale. |
| `engineering-search-relevance-engineer` | Search Relevance Engineer | Expert search engineer for Elasticsearch and OpenSearch — index and analyzer design, BM25 query tuning, hybrid lexical+vector retrieval, and judgment-based relevance… |
| `engineering-section-508-specialist` | Section 508 Accessibility Specialist | Expert U.S. federal Section 508 accessibility engineer (the 508 legal baseline is WCAG 2.0 Level AA; WCAG 2.1/2.2 AA are recommended best practice, and ADA Title II… |
| `engineering-senior-developer` | Senior Developer | Premium implementation specialist - Masters Laravel/Livewire/FluxUI, advanced CSS, Three.js integration |
| `engineering-servicenow-developer-mentor` | ServiceNow Developer & Mentor | ServiceNow platform developer and step-by-step troubleshooter — Business Rules, Script Includes, GlideRecord/GlideAggregate, Flow Designer, ACLs, and "is this OOTB or… |
| `engineering-software-architect` | Software Architect | Expert software architect specializing in system design, domain-driven design, architectural patterns, and technical decision-making for scalable, maintainable systems. |
| `engineering-solidity-smart-contract-engineer` | Solidity Smart Contract Engineer | Expert Solidity developer specializing in EVM smart contract architecture, gas optimization, upgradeable proxy patterns, DeFi protocol development, and security-first… |
| `engineering-technical-writer` | Technical Writer | Expert technical writer specializing in developer documentation, API references, README files, and tutorials. Transforms complex engineering concepts into clear,… |
| `engineering-uswds-developer` | USWDS Developer | Expert U.S. Web Design System frontend developer specializing in USWDS components and design tokens, accessible-by-default patterns, responsive government UI, Sass… |
| `engineering-universal-document-compiler` | Universal Document Compiler | Architect of schema-agnostic document ASTs, algorithmic data-shape layout inference, bidirectional CST-to-canvas synchronization, and universal paged document publishing. |
| `engineering-video-streaming-engineer` | Video Streaming Engineer | Expert video streaming engineer for adaptive bitrate delivery — HLS/DASH packaging, ffmpeg transcode ladders, CMAF low-latency, DRM, CDN delivery, and QoE-driven… |
| `engineering-voice-ai-integration-engineer` | Voice AI Integration Engineer | Expert in building end-to-end speech transcription pipelines using Whisper-style models and cloud ASR services — from raw audio ingestion through preprocessing,… |
| `engineering-wechat-mini-program-developer` | WeChat Mini Program Developer | Expert WeChat Mini Program developer specializing in 小程序 development with WXML/WXSS/WXS, WeChat API integration, payment systems, subscription messaging, and the full… |
| `engineering-webassembly-engineer` | WebAssembly Engineer | Expert WebAssembly engineer — compiling Rust/C++/Go to Wasm, JS interop and the boundary marshalling cost, WASI and server-side runtimes (Wasmtime/Wasmer), the… |
| `engineering-wordpress-performance` | WordPress Performance Engineer | Expert WordPress performance engineer specializing in Core Web Vitals, object caching (Redis/Memcached), page caching, database and WP_Query optimization, the… |
| `engineering-wordpress-shopping-cart` | WordPress Shopping Cart Engineer | Expert WordPress e-commerce engineer specializing in WooCommerce for product catalog management, payment gateway integration, checkout customization, order… |

### Testing y QA (9)

| id | Nombre | Descripción |
|---|---|---|
| `testing-api-tester` | API Tester | Expert API testing specialist focused on comprehensive API validation, performance testing, and quality assurance across all systems and third-party integrations |
| `testing-accessibility-auditor` | Accessibility Auditor | Expert accessibility specialist who audits interfaces against WCAG standards, tests with assistive technologies, and ensures inclusive design. Defaults to finding… |
| `testing-evidence-collector` | Evidence Collector | Screenshot-obsessed, fantasy-allergic QA specialist - Reports reproducible issues with evidence and marks untested scope honestly |
| `testing-performance-benchmarker` | Performance Benchmarker | Expert performance testing and optimization specialist focused on measuring, analyzing, and improving system performance across all applications and infrastructure |
| `testing-reality-checker` | Reality Checker | Stops fantasy approvals, evidence-based certification - Default to "NEEDS WORK", requires overwhelming proof for production readiness |
| `testing-test-automation-engineer` | Test Automation Engineer | Expert end-to-end test automation engineer for Playwright and Cypress — resilient selectors, flake elimination, isolated test data, CI parallelization, and… |
| `testing-test-results-analyzer` | Test Results Analyzer | Expert test analysis specialist focused on comprehensive test result evaluation, quality metrics analysis, and actionable insight generation from testing activities |
| `testing-tool-evaluator` | Tool Evaluator | Expert technology assessment specialist focused on evaluating, testing, and recommending tools, software, and platforms for business use and productivity optimization |
| `testing-workflow-optimizer` | Workflow Optimizer | Expert process improvement specialist focused on analyzing, optimizing, and automating workflows across all business functions for maximum productivity and efficiency |

### Diseño (10)

| id | Nombre | Descripción |
|---|---|---|
| `design-brand-guardian` | Brand Guardian | Expert brand strategist and guardian specializing in brand identity development, consistency maintenance, and strategic brand positioning |
| `design-image-prompt-engineer` | Image Prompt Engineer | Expert photography prompt engineer specializing in crafting detailed, evocative prompts for AI image generation. Masters the art of translating visual concepts into… |
| `design-inclusive-visuals-specialist` | Inclusive Visuals Specialist | Representation expert who defeats systemic AI biases to generate culturally accurate, affirming, and non-stereotypical images and video. |
| `design-persona-walkthrough` | Persona Walkthrough Specialist | Simulate cognitive walkthroughs of web pages from a defined persona's psychological perspective — captures emotional reactions and rational thought at each scroll… |
| `design-ui-designer` | UI Designer | Expert UI designer specializing in visual design systems, component libraries, and pixel-perfect interface creation. Creates beautiful, consistent, accessible user… |
| `design-ui-finish-gate-reviewer` | UI Finish-Gate Reviewer | Product-interface reviewer who catches generic, interchangeable UI before it ships by grounding critique in real product evidence, a written design contract, and a… |
| `design-ux-architect` | UX Architect | Technical architecture and UX specialist who provides developers with solid foundations, CSS systems, and clear implementation guidance |
| `design-ux-researcher` | UX Researcher | Expert user experience researcher specializing in user behavior analysis, usability testing, and data-driven design insights. Provides actionable research findings… |
| `design-visual-storyteller` | Visual Storyteller | Expert visual communication specialist focused on creating compelling visual narratives, multimedia content, and brand storytelling through design. Specializes in… |
| `design-whimsy-injector` | Whimsy Injector | Expert creative specialist focused on adding personality, delight, and playful elements to brand experiences. Creates memorable, joyful interactions that… |

### Seguridad (12)

| id | Nombre | Descripción |
|---|---|---|
| `security-ai-generated-code-auditor` | AI-Generated Code Security Auditor | Security reviewer for AI-generated and vibe-coded apps — hunts the hardcoded secrets, broken row-level security, and prompt-injection sinks that coding assistants… |
| `security-appsec-engineer` | Application Security Engineer | AppSec specialist who secures the software development lifecycle through threat modeling, secure code review, SAST/DAST integration, and developer security education… |
| `security-blockchain-security-auditor` | Blockchain Security Auditor | Expert smart contract security auditor specializing in vulnerability detection, formal verification, exploit analysis, and comprehensive audit report writing for DeFi… |
| `security-cloud-security-architect` | Cloud Security Architect | Cloud-native security specialist designing zero trust architectures, implementing defense-in-depth across AWS, Azure, and GCP, and securing infrastructure-as-code… |
| `security-compliance-auditor` | Compliance Auditor | Expert technical compliance auditor specializing in SOC 2, ISO 27001, HIPAA, and PCI-DSS audits — from readiness assessment through evidence collection to certification. |
| `security-incident-responder` | Incident Responder | Digital forensics and incident response specialist who leads breach investigations, contains active threats, coordinates crisis response, and writes post-mortems that… |
| `security-penetration-tester` | Penetration Tester | Offensive security specialist conducting authorized penetration tests, red team operations, and vulnerability assessments across networks, web applications, and cloud… |
| `security-secrets-credential-engineer` | Secrets & Credential Hygiene Engineer | Owns the full lifecycle of secrets and credentials — detection, prevention, vaulting, rotation, and leak response — so an application runs on short-lived,… |
| `security-architect` | Security Architect | Expert security architect specializing in threat modeling, secure-by-design architecture, trust-boundary analysis, defense-in-depth, and risk-based security reviews… |
| `security-senior-secops` | Senior SecOps Engineer | Defensive application security specialist who scans every code submission for secrets and sensitive data exposure before anything else, then implements or audits… |
| `security-threat-detection-engineer` | Threat Detection Engineer | Expert detection engineer specializing in SIEM rule development, MITRE ATT&CK coverage mapping, threat hunting, alert tuning, and detection-as-code pipelines for… |
| `security-threat-intelligence-analyst` | Threat Intelligence Analyst | Cyber threat intelligence specialist who tracks adversary groups, maps attack campaigns to MITRE ATT&CK, produces actionable intelligence reports, and builds… |

### Producto (6)

| id | Nombre | Descripción |
|---|---|---|
| `product-behavioral-nudge-engine` | Behavioral Nudge Engine | Behavioral psychology specialist that adapts software interaction cadences and styles to maximize user motivation and success. |
| `product-dx-engineer` | DX Engineer | Removes every unnecessary step between a developer and their first success — SDK samples, onboarding flows, error messages, and the feedback loops that make products… |
| `product-feedback-synthesizer` | Feedback Synthesizer | Expert in collecting, analyzing, and synthesizing user feedback from multiple channels to extract actionable product insights. Transforms qualitative feedback into… |
| `product-manager` | Product Manager | Holistic product leader who owns the full product lifecycle — from discovery and strategy through roadmap, stakeholder alignment, go-to-market, and outcome… |
| `product-sprint-prioritizer` | Sprint Prioritizer | Expert product manager specializing in agile sprint planning, feature prioritization, and resource allocation. Focused on maximizing team velocity and business value… |
| `product-trend-researcher` | Trend Researcher | Expert market intelligence analyst specializing in identifying emerging trends, competitive analysis, and opportunity assessment. Focused on providing actionable… |

### Gestión de proyectos (7)

| id | Nombre | Descripción |
|---|---|---|
| `project-management-experiment-tracker` | Experiment Tracker | Expert project manager specializing in experiment design, execution tracking, and data-driven decision making. Focused on managing A/B tests, feature experiments, and… |
| `project-management-jira-workflow-steward` | Jira Workflow Steward | Expert delivery operations specialist who enforces Jira-linked Git workflows, traceable commits, structured pull requests, and release-safe branch strategy across… |
| `project-management-meeting-notes-specialist` | Meeting Notes Specialist | Extract structured decisions, action items, and open questions from meeting transcripts or rough notes into a clean 4-section summary. |
| `project-management-project-shepherd` | Project Shepherd | Expert project manager specializing in cross-functional project coordination, timeline management, and stakeholder alignment. Focused on shepherding projects from… |
| `project-manager-senior` | Senior Project Manager | Converts specs to tasks and remembers previous projects. Focused on realistic scope, no background processes, exact spec requirements |
| `project-management-studio-operations` | Studio Operations | Expert operations manager specializing in day-to-day studio efficiency, process optimization, and resource coordination. Focused on ensuring smooth operations,… |
| `project-management-studio-producer` | Studio Producer | Senior strategic leader specializing in high-level creative and technical project orchestration, resource allocation, and multi-project portfolio management. Focused… |

### Soporte y operaciones (6)

| id | Nombre | Descripción |
|---|---|---|
| `support-analytics-reporter` | Analytics Reporter | Expert data analyst transforming raw data into actionable business insights. Creates dashboards, performs statistical analysis, tracks KPIs, and provides strategic… |
| `support-executive-summary-generator` | Executive Summary Generator | Consultant-grade AI specialist trained to think and communicate like a senior strategy consultant. Transforms complex business inputs into concise, actionable… |
| `support-finance-tracker` | Finance Tracker | Expert financial analyst and controller specializing in financial planning, budget management, and business performance analysis. Maintains financial health,… |
| `support-infrastructure-maintainer` | Infrastructure Maintainer | Expert infrastructure specialist focused on system reliability, performance optimization, and technical operations management. Maintains robust, scalable… |
| `support-legal-compliance-checker` | Legal Compliance Checker | Expert legal and compliance specialist ensuring business operations, data handling, and content creation comply with relevant laws, regulations, and industry… |
| `support-support-responder` | Support Responder | Expert customer support specialist delivering exceptional customer service, issue resolution, and user experience optimization. Specializes in multi-channel support,… |

### Marketing (37)

| id | Nombre | Descripción |
|---|---|---|
| `marketing-aeo-foundations` | AEO Foundations Architect | Expert in AI Engine Optimization infrastructure — implements llms.txt, AI-aware robots.txt, token-budgeted content, structured Markdown availability, and agent… |
| `marketing-ai-citation-strategist` | AI Citation Strategist | Expert in AI recommendation engine optimization (AEO/GEO) — audits brand visibility across ChatGPT, Claude, Gemini, and Perplexity, identifies why competitors get… |
| `marketing-agentic-search-optimizer` | Agentic Search Optimizer | Expert in WebMCP readiness and agentic task completion — audits whether AI agents can actually accomplish tasks on your site (book, buy, register, subscribe),… |
| `marketing-app-store-optimizer` | App Store Optimizer | Expert app store marketing specialist focused on App Store Optimization (ASO), conversion rate optimization, and app discoverability |
| `marketing-baidu-seo-specialist` | Baidu SEO Specialist | Expert Baidu search optimization specialist focused on Chinese search engine ranking, Baidu ecosystem integration, ICP compliance, Chinese keyword research, and… |
| `marketing-bilibili-content-strategist` | Bilibili Content Strategist | Expert Bilibili marketing specialist focused on UP主 growth, danmaku culture mastery, B站 algorithm optimization, community building, and branded content strategy for… |
| `marketing-book-co-author` | Book Co-Author | Strategic thought-leadership book collaborator for founders, experts, and operators turning voice notes, fragments, and positioning into structured first-person chapters. |
| `marketing-carousel-growth-engine` | Carousel Growth Engine | Autonomous TikTok and Instagram carousel generation specialist. Analyzes any website URL with Playwright, generates viral 6-slide carousels via Gemini image… |
| `marketing-china-ecommerce-operator` | China E-Commerce Operator | Expert China e-commerce operations specialist covering Taobao, Tmall, Pinduoduo, and JD ecosystems with deep expertise in product listing optimization, live commerce,… |
| `marketing-china-market-localization-strategist` | China Market Localization Strategist | Full-stack China market localization expert who transforms real-time trend signals into executable go-to-market strategies across Douyin, Xiaohongshu, WeChat,… |
| `marketing-content-creator` | Content Creator | Expert content strategist and creator for multi-platform campaigns. Develops editorial calendars, creates compelling copy, manages brand storytelling, and optimizes… |
| `marketing-cross-border-ecommerce` | Cross-Border E-Commerce Specialist | Full-funnel cross-border e-commerce strategist covering Amazon, Shopee, Lazada, AliExpress, Temu, and TikTok Shop operations, international logistics and overseas… |
| `marketing-developer-community-builder` | Developer Community Builder | Grows and sustains developer communities — Discord servers, GitHub discussions, forums, and contributor programs — turning users into advocates and advocates into… |
| `marketing-douyin-strategist` | Douyin Strategist | Short-video marketing expert specializing in the Douyin platform, with deep expertise in recommendation algorithm mechanics, viral video planning, livestream commerce… |
| `marketing-email-strategist` | Email Marketing Strategist | Expert email marketing strategist for CRM-driven campaigns, lifecycle automation, segmentation architecture, and deliverability. Designs sequences (welcome, nurture,… |
| `marketing-global-podcast-strategist` | Global Podcast Strategist | Expert podcast growth specialist focused on show positioning, audience development, content strategy, and monetisation. Transforms raw ideas into authoritative audio… |
| `marketing-growth-hacker` | Growth Hacker | Expert growth strategist specializing in rapid user acquisition through data-driven experimentation. Develops viral loops, optimizes conversion funnels, and finds… |
| `marketing-instagram-curator` | Instagram Curator | Expert Instagram marketing specialist focused on visual storytelling, community building, and multi-format content optimization. Masters aesthetic development and… |
| `marketing-kuaishou-strategist` | Kuaishou Strategist | Expert Kuaishou marketing strategist specializing in short-video content for China's lower-tier city markets, live commerce operations, community trust building, and… |
| `marketing-linkedin-content-creator` | LinkedIn Content Creator | Expert LinkedIn content strategist focused on thought leadership, personal brand building, and high-engagement professional content. Masters LinkedIn's algorithm and… |
| `marketing-livestream-commerce-coach` | Livestream Commerce Coach | Veteran livestream e-commerce coach specializing in host training and live room operations across Douyin, Kuaishou, Taobao Live, and Channels, covering script design,… |
| `marketing-multi-platform-publisher` | Multi-Platform Publisher | Expert orchestrator for one-click Chinese blog publishing. Routes a single article to 知乎 / 小红书 / CSDN / B站 / 公众号 / 掘金 via Wechatsync (main channel) with xhs-mcp and… |
| `marketing-pr-communications-manager` | PR & Communications Manager | Strategic public relations and communications specialist for media relations, press releases, crisis communications, executive thought leadership, brand reputation… |
| `marketing-podcast-strategist` | Podcast Strategist | Content strategy and operations expert for the Chinese podcast market, with deep expertise in Xiaoyuzhou, Ximalaya, and other major audio platforms, covering show… |
| `marketing-private-domain-operator` | Private Domain Operator | Expert in building enterprise WeChat (WeCom) private domain ecosystems, with deep expertise in SCRM systems, segmented community operations, Mini Program commerce… |
| `marketing-reddit-community-builder` | Reddit Community Builder | Expert Reddit marketing specialist focused on authentic community engagement, value-driven content creation, and long-term relationship building. Masters Reddit… |
| `marketing-seo-specialist` | SEO Specialist | Expert search engine optimization strategist specializing in technical SEO, content optimization, link authority building, and organic search growth. Drives… |
| `marketing-short-video-editing-coach` | Short-Video Editing Coach | Hands-on short-video editing coach covering the full post-production pipeline, with mastery of CapCut Pro, Premiere Pro, DaVinci Resolve, and Final Cut Pro across… |
| `marketing-social-media-strategist` | Social Media Strategist | Expert social media strategist for LinkedIn, Twitter, and professional platforms. Creates cross-platform campaigns, builds communities, manages real-time engagement,… |
| `marketing-tiktok-strategist` | TikTok Strategist | Expert TikTok marketing specialist focused on viral content creation, algorithm optimization, and community building. Masters TikTok's unique culture and features for… |
| `marketing-twitter-engager` | Twitter Engager | Expert Twitter marketing specialist focused on real-time engagement, thought leadership building, and community-driven growth. Builds brand authority through… |
| `marketing-video-optimization-specialist` | Video Optimization Specialist | Video marketing strategist specializing in YouTube algorithm optimization, audience retention, chaptering, thumbnail concepts, and cross-platform video syndication. |
| `marketing-wechat-official-account` | WeChat Official Account Manager | Expert WeChat Official Account (OA) strategist specializing in content marketing, subscriber engagement, and conversion optimization. Masters multi-format content and… |
| `marketing-weibo-strategist` | Weibo Strategist | Full-spectrum operations expert for Sina Weibo, with deep expertise in trending topic mechanics, Super Topic community management, public sentiment monitoring, fan… |
| `marketing-x-twitter-intelligence-analyst` | X/Twitter Intelligence Analyst | Social intelligence specialist for X/Twitter research, trend detection, account monitoring, and evidence-backed audience insights using public signals and structured… |
| `marketing-xiaohongshu-specialist` | Xiaohongshu Specialist | Expert Xiaohongshu marketing specialist focused on lifestyle content, trend-driven strategies, and authentic community engagement. Masters micro-content creation and… |
| `marketing-zhihu-strategist` | Zhihu Strategist | Expert Zhihu marketing specialist focused on thought leadership, community credibility, and knowledge-driven engagement. Masters question-answering strategy and… |

### Publicidad pagada (7)

| id | Nombre | Descripción |
|---|---|---|
| `paid-media-creative-strategist` | Ad Creative Strategist | Paid media creative specialist focused on ad copywriting, RSA optimization, asset group design, and creative testing frameworks across Google, Meta, Microsoft, and… |
| `paid-media-ppc-strategist` | PPC Campaign Strategist | Senior paid media strategist specializing in large-scale search, shopping, and performance max campaign architecture across Google, Microsoft, and Amazon ad… |
| `paid-media-auditor` | Paid Media Auditor | Comprehensive paid media auditor who systematically evaluates Google Ads, Microsoft Ads, and Meta accounts across 200+ checkpoints spanning account structure,… |
| `paid-media-paid-social-strategist` | Paid Social Strategist | Cross-platform paid social advertising specialist covering Meta (Facebook/Instagram), LinkedIn, TikTok, Pinterest, X, and Snapchat. Designs full-funnel social ad… |
| `paid-media-programmatic-buyer` | Programmatic & Display Buyer | Display advertising and programmatic media buying specialist covering managed placements, Google Display Network, DV360, trade desk platforms, partner media… |
| `paid-media-search-query-analyst` | Search Query Analyst | Specialist in search term analysis, negative keyword architecture, and query-to-intent mapping. Turns raw search query data into actionable optimizations that… |
| `paid-media-tracking-specialist` | Tracking & Measurement Specialist | Expert in conversion tracking architecture, tag management, and attribution modeling across Google Tag Manager, GA4, Google Ads, Meta CAPI, LinkedIn Insight Tag, and… |

### Ventas (9)

| id | Nombre | Descripción |
|---|---|---|
| `sales-account-strategist` | Account Strategist | Expert post-sale account strategist specializing in land-and-expand execution, stakeholder mapping, QBR facilitation, and net revenue retention. Turns closed deals… |
| `sales-deal-strategist` | Deal Strategist | Senior deal strategist specializing in MEDDPICC qualification, competitive positioning, and win planning for complex B2B sales cycles. Scores opportunities, exposes… |
| `sales-discovery-coach` | Discovery Coach | Coaches sales teams on elite discovery methodology — question design, current-state mapping, gap quantification, and call structure that surfaces real buying motivation. |
| `sales-offer-lead-gen-strategist` | Offer & Lead Gen Strategist | Top-of-funnel architect who designs irresistible offers and lead magnets that attract qualified buyers at scale. Specializes in value-equation offer construction,… |
| `sales-outbound-strategist` | Outbound Strategist | Signal-based outbound specialist who designs multi-channel prospecting sequences, defines ICPs, and builds pipeline through research-driven personalization — not volume. |
| `sales-pipeline-analyst` | Pipeline Analyst | Revenue operations analyst specializing in pipeline health diagnostics, deal velocity analysis, forecast accuracy, and data-driven sales coaching. Turns CRM data into… |
| `sales-proposal-strategist` | Proposal Strategist | Strategic proposal architect who transforms RFPs and sales opportunities into compelling win narratives. Specializes in win theme development, competitive… |
| `sales-coach` | Sales Coach | Expert sales coaching specialist focused on rep development, pipeline review facilitation, call coaching, deal strategy, and forecast accuracy. Makes every rep and… |
| `sales-engineer` | Sales Engineer | Senior pre-sales engineer specializing in technical discovery, demo engineering, POC scoping, competitive battlecards, and bridging product capabilities to business… |

### Finanzas (5)

| id | Nombre | Descripción |
|---|---|---|
| `finance-bookkeeper-controller` | Bookkeeper & Controller | Expert bookkeeper and controller specializing in day-to-day accounting operations, financial reconciliations, month-end close processes, and internal controls.… |
| `finance-fpa-analyst` | FP&A Analyst | Expert Financial Planning & Analysis (FP&A) analyst specializing in budgeting, variance analysis, financial planning, rolling forecasts, and strategic decision… |
| `finance-financial-analyst` | Financial Analyst | Expert financial analyst specializing in financial modeling, forecasting, scenario analysis, and data-driven decision support. Transforms raw financial data into… |
| `finance-investment-researcher` | Investment Researcher | Expert investment researcher specializing in market research, due diligence, portfolio analysis, and asset valuation. Conducts rigorous fundamental and quantitative… |
| `finance-tax-strategist` | Tax Strategist | Expert tax strategist specializing in tax optimization, multi-jurisdictional compliance, transfer pricing, and strategic tax planning. Navigates complex tax codes to… |

### Académicos (6)

| id | Nombre | Descripción |
|---|---|---|
| `academic-anthropologist` | Anthropologist | Expert in cultural systems, rituals, kinship, belief systems, and ethnographic method — builds culturally coherent societies that feel lived-in rather than invented |
| `academic-geographer` | Geographer | Expert in physical and human geography, climate systems, cartography, and spatial analysis — builds geographically coherent worlds where terrain, climate, resources,… |
| `academic-historian` | Historian | Expert in historical analysis, periodization, material culture, and historiography — validates historical coherence and enriches settings with authentic period detail… |
| `academic-narratologist` | Narratologist | Expert in narrative theory, story structure, character arcs, and literary analysis — grounds advice in established frameworks from Propp to Campbell to modern narratology |
| `academic-psychologist` | Psychologist | Expert in human behavior, personality theory, motivation, and cognitive patterns — builds psychologically credible characters and interactions grounded in clinical… |
| `academic-statistician` | Statistician | Expert in quantitative research methodology, experimental design, and statistical inference — pressure-tests claims, designs sound studies, and separates real signal… |

### Investigación (1)

| id | Nombre | Descripción |
|---|---|---|
| `research-synthesist` | Research Synthesist | Expert in literature review, source evaluation, and evidence synthesis — turns a scattered pile of sources into a structured, honestly-weighted map of what the… |

### Salud (3)

| id | Nombre | Descripción |
|---|---|---|
| `healthcare-clinical-evidence-agent` | Clinical Evidence Agent | Evidence standards and clinical credibility framework for AI agents |
| `healthcare-innovation-strategist` | Healthcare Innovation Strategist | Strategic narrative architect for healthcare founders operating at |
| `healthcare-sovereign-health-systems-agent` | Sovereign Health Systems Agent | Government health mandate engagement framework for AI agents |

### GIS y mapas (13)

| id | Nombre | Descripción |
|---|---|---|
| `gis-3d-scene-developer` | 3D & Scene Developer | Web 3D visualization specialist who creates immersive 3D scenes, terrain models, point cloud visualizations, and interactive web experiences using Cesium, ArcGIS… |
| `gis-bim-specialist` | BIM/GIS Specialist | Integration specialist who bridges Building Information Modeling and Geographic Information Systems — Revit/IFC data conversion, indoor mapping, digital twin… |
| `gis-cartography-designer` | Cartography Designer | Map aesthetics specialist who designs beautiful, readable, and effective maps — color theory, typography, label placement, basemap selection, and visual hierarchy for… |
| `gis-drone-reality-mapping` | Drone/Reality Mapping Specialist | Photogrammetry and reality capture expert who processes drone imagery into orthomosaics, digital terrain models, point clouds, and 3D meshes — bridging field capture… |
| `gis-analyst` | GIS Analyst | Day-to-day GIS operator who creates maps, manages layers, performs spatial queries, and maintains geospatial data integrity across desktop and web environments. |
| `gis-qa-engineer` | GIS QA Engineer | Quality assurance specialist who validates geospatial data integrity — topology checks, metadata audits, CRS consistency, accuracy assessment, and compliance… |
| `gis-geoai-ml-engineer` | GeoAI/ML Engineer | Geospatial machine learning specialist who builds models for feature extraction, object detection, image segmentation, and land cover classification from satellite… |
| `gis-geoprocessing-specialist` | Geoprocessing Specialist | ArcPy and Python toolbox expert who automates spatial workflows — builds .pyt toolboxes, Model Builder processes, batch geoprocessing automation, and custom analysis… |
| `gis-solution-engineer` | Solution Engineer | Hands-on GIS prototype builder who takes strategy from Technical Consultant and turns it into working demos, proof-of-concepts, and technical validations across the… |
| `gis-spatial-data-engineer` | Spatial Data Engineer | ETL specialist who transforms messy geospatial data from any source into clean, standardized, production-ready datasets — format conversion, CRS reprojection,… |
| `gis-spatial-data-scientist` | Spatial Data Scientist | Advanced spatial analytics specialist who applies statistical modeling, spatial econometrics, clustering, and predictive analytics to geospatial data — finding… |
| `gis-technical-consultant` | Technical Consultant | Strategic GIS advisor who translates business problems into geospatial solutions — gap analysis, technology roadmaps, RFP responses, and digital transformation… |
| `gis-web-gis-developer` | Web GIS Developer | Full-stack web GIS engineer who builds interactive mapping applications — MapLibre GL JS, ArcGIS JS API, Leaflet, real-time dashboards, REST API integration, and… |

### Desarrollo de videojuegos (21)

| id | Nombre | Descripción |
|---|---|---|
| `blender-addon-engineer` | Blender Add-on Engineer | Blender tooling specialist - Builds Python add-ons, asset validators, exporters, and pipeline automations that turn repetitive DCC work into reliable one-click workflows |
| `economy-designer` | Economy Designer | Virtual economy architect - Masters currency systems, sources and sinks, monetization modeling, inflation control, and data-driven economic balancing for live games |
| `game-audio-engineer` | Game Audio Engineer | Interactive audio specialist - Masters FMOD/Wwise integration, adaptive music systems, spatial audio, and audio performance budgeting across all game engines |
| `game-designer` | Game Designer | Systems and mechanics architect - Masters GDD authorship, player psychology, economy balancing, and gameplay loop design across all engines and genres |
| `godot-gameplay-scripter` | Godot Gameplay Scripter | Composition and signal integrity specialist - Masters GDScript 2.0, C# integration, node-based architecture, and type-safe signal design for Godot 4 projects |
| `godot-multiplayer-engineer` | Godot Multiplayer Engineer | Godot 4 networking specialist - Masters the MultiplayerAPI, scene replication, ENet/WebRTC transport, RPCs, and authority models for real-time multiplayer games |
| `godot-shader-developer` | Godot Shader Developer | Godot 4 visual effects specialist - Masters the Godot Shading Language (GLSL-like), VisualShader editor, CanvasItem and Spatial shaders, post-processing, and… |
| `level-designer` | Level Designer | Spatial storytelling and flow specialist - Masters layout theory, pacing architecture, encounter design, and environmental narrative across all game engines |
| `narrative-designer` | Narrative Designer | Story systems and dialogue architect - Masters GDD-aligned narrative design, branching dialogue, lore architecture, and environmental storytelling across all game engines |
| `roblox-avatar-creator` | Roblox Avatar Creator | Roblox UGC and avatar pipeline specialist - Masters Roblox's avatar system, UGC item creation, accessory rigging, texture standards, and the Creator Marketplace… |
| `roblox-experience-designer` | Roblox Experience Designer | Roblox platform UX and monetization specialist - Masters engagement loop design, DataStore-driven progression, Roblox monetization systems (Passes, Developer… |
| `roblox-systems-scripter` | Roblox Systems Scripter | Roblox platform engineering specialist - Masters Luau, the client-server security model, RemoteEvents/RemoteFunctions, DataStore, and module architecture for scalable… |
| `technical-artist` | Technical Artist | Art-to-engine pipeline specialist - Masters shaders, VFX systems, LOD pipelines, performance budgeting, and cross-engine asset optimization |
| `unity-architect` | Unity Architect | Data-driven modularity specialist - Masters ScriptableObjects, decoupled systems, and single-responsibility component design for scalable Unity projects |
| `unity-editor-tool-developer` | Unity Editor Tool Developer | Unity editor automation specialist - Masters custom EditorWindows, PropertyDrawers, AssetPostprocessors, ScriptedImporters, and pipeline automation that saves teams… |
| `unity-multiplayer-engineer` | Unity Multiplayer Engineer | Networked gameplay specialist - Masters Netcode for GameObjects, Unity Gaming Services (Relay/Lobby), client-server authority, lag compensation, and state synchronization |
| `unity-shader-graph-artist` | Unity Shader Graph Artist | Visual effects and material specialist - Masters Unity Shader Graph, HLSL, URP/HDRP rendering pipelines, and custom pass authoring for real-time visual effects |
| `unreal-multiplayer-architect` | Unreal Multiplayer Architect | Unreal Engine networking specialist - Masters Actor replication, GameMode/GameState architecture, server-authoritative gameplay, network prediction, and dedicated… |
| `unreal-systems-engineer` | Unreal Systems Engineer | Performance and hybrid architecture specialist - Masters C++/Blueprint continuum, Nanite geometry, Lumen GI, and Gameplay Ability System for AAA-grade Unreal Engine… |
| `unreal-technical-artist` | Unreal Technical Artist | Unreal Engine visual pipeline specialist - Masters the Material Editor, Niagara VFX, Procedural Content Generation, and the art-to-engine pipeline for UE5 projects |
| `unreal-world-builder` | Unreal World Builder | Open-world and environment specialist - Masters UE5 World Partition, Landscape, procedural foliage, HLOD, and large-scale level streaming for seamless open-world… |

### Computación espacial (XR) (6)

| id | Nombre | Descripción |
|---|---|---|
| `terminal-integration-specialist` | Terminal Integration Specialist | Terminal emulation, text rendering optimization, and SwiftTerm integration for modern Swift applications |
| `xr-cockpit-interaction-specialist` | XR Cockpit Interaction Specialist | Specialist in designing and developing immersive cockpit-based control systems for XR environments |
| `xr-immersive-developer` | XR Immersive Developer | Expert WebXR and immersive technology developer with specialization in browser-based AR/VR/XR applications |
| `xr-interface-architect` | XR Interface Architect | Spatial interaction designer and interface strategist for immersive AR/VR/XR environments |
| `macos-spatial-metal-engineer` | macOS Spatial/Metal Engineer | Native Swift and Metal specialist building high-performance 3D rendering systems and spatial computing experiences for macOS and Vision Pro |
| `visionos-spatial-engineer` | visionOS Spatial Engineer | Native visionOS spatial computing, SwiftUI volumetric interfaces, and Liquid Glass design implementation |

### Especializados (varios) (59)

| id | Nombre | Descripción |
|---|---|---|
| `accounts-payable-agent` | Accounts Payable Agent | Autonomous payment processing specialist that executes vendor payments, contractor invoices, and recurring bills across any payment rail — crypto, fiat, stablecoins.… |
| `agentic-identity-trust` | Agentic Identity & Trust Architect | Designs identity, authentication, and trust verification systems for autonomous AI agents operating in multi-agent environments. Ensures agents can prove who they… |
| `agents-orchestrator` | Agents Orchestrator | Autonomous pipeline manager that orchestrates the entire development workflow. You are the leader of this process. |
| `healthcare-aging-parent-care-companion` | Aging Parent Care Companion | Compassionate, HIPAA-aligned care coordination and decision-support agent for family caregivers managing an aging parent's appointments, medications, care team… |
| `automation-governance-architect` | Automation Governance Architect | Governance-first architect for business automations (n8n-first) who audits value, risk, and maintainability before implementation. |
| `business-strategist` | Business Strategist | Senior management consulting specialist for competitive analysis, market entry strategy, business model design, growth planning, organizational strategy, and… |
| `change-management-consultant` | Change Management Consultant | Expert change management specialist using ADKAR, Kotter, and Prosci frameworks to guide organizations through technology implementations, restructuring, culture… |
| `chief-financial-officer` | Chief Financial Officer | Strategic finance executive who governs capital allocation, treasury operations, financial planning, M&A finance, investor relations, and board reporting —… |
| `specialized-chief-of-staff` | Chief of Staff | Master coordinator for founders and executives — filters noise, owns processes, enforces consistency, routes decisions, and positions outputs for impact so the boss… |
| `specialized-civil-engineer` | Civil Engineer | Expert civil and structural engineer with global standards coverage — Eurocode, DIN, ACI, AISC, ASCE, AS/NZS, CSA, GB, IS, AIJ, and more. Specializes in structural… |
| `specialized-codebase-archaeologist` | Codebase Archaeologist | Multi-session, multi-tool drift detection specialist who audits codebases touched by several AI coding tools (Claude, Cursor, Copilot, Windsurf, etc.) over time,… |
| `corporate-training-designer` | Corporate Training Designer | Expert in enterprise training system design and curriculum development — proficient in training needs analysis, instructional design methodology, blended learning… |
| `specialized-cultural-intelligence-strategist` | Cultural Intelligence Strategist | CQ specialist that detects invisible exclusion, researches global context, and ensures software resonates authentically across intersectional identities. |
| `customer-service` | Customer Service | Friendly, professional customer service specialist for any industry — handling inquiries, complaints, account support, FAQs, and seamless escalation with warmth,… |
| `customer-success-manager` | Customer Success Manager | Strategic customer success specialist for onboarding, health scoring, QBR facilitation, churn prevention, expansion identification, and renewal management — driving… |
| `data-consolidation-agent` | Data Consolidation Agent | AI agent that consolidates extracted sales data into live reporting dashboards with territory, rep, and pipeline summaries |
| `data-privacy-officer` | Data Privacy Officer | Corporate data privacy specialist and DPO who builds GDPR, CCPA, and global privacy compliance programs — covering data mapping, privacy impact assessments, consent… |
| `specialized-developer-advocate` | Developer Advocate | Expert developer advocate specializing in building developer communities, creating compelling technical content, optimizing developer experience (DX), and driving… |
| `specialized-document-generator` | Document Generator | Expert document creation specialist who generates professional PDF, PPTX, DOCX, and XLSX files using code-based approaches with proper formatting, charts, and data… |
| `esg-sustainability-officer` | ESG & Sustainability Officer | Corporate sustainability strategist and ESG reporting specialist who builds environmental, social, and governance programs, manages disclosures, drives… |
| `specialized-fedramp-rmf-compliance` | FedRAMP & RMF Compliance Engineer | Expert FedRAMP and NIST Risk Management Framework compliance engineer specializing in both FedRAMP authorization pathways — the traditional Rev5 path (NIST 800-53 Rev… |
| `specialized-focus-music-architect` | Focus Music Architect | Instrumental focus music specialist and neuroacoustic prompt engineer — crafts high-yield prompts, soundscape architectures, BPM curves, and binaural layers for deep… |
| `specialized-french-consulting-market` | French Consulting Market Navigator | Navigate the French ESN/SI freelance ecosystem — margin models, platform mechanics (Malt, collective.work), portage salarial, rate positioning, and payment cycle… |
| `government-digital-presales-consultant` | Government Digital Presales Consultant | Presales expert for China's government digital transformation market (ToG), proficient in policy interpretation, solution design, bid document preparation, POC… |
| `grant-writer` | Grant Writer | Expert grant writing specialist for nonprofits, research institutions, and social enterprises — covering prospect research, letter of inquiry writing, full proposal… |
| `hr-onboarding` | HR Onboarding | Comprehensive HR onboarding specialist for employee orientation, documentation management, compliance tracking, benefits enrollment, culture integration, and new hire… |
| `healthcare-customer-service` | Healthcare Customer Service | Empathetic healthcare customer service specialist for patient support, billing inquiries, appointment management, insurance questions, complaint resolution, and… |
| `healthcare-marketing-compliance` | Healthcare Marketing Compliance Specialist | Expert in healthcare marketing compliance in China, proficient in the Advertising Law, Medical Advertisement Management Measures, Drug Administration Law, and related… |
| `hospitality-guest-services` | Hospitality Guest Services | Comprehensive hospitality guest services specialist for hotels, resorts, restaurants, and event venues — covering reservations, check-in/check-out, concierge… |
| `identity-graph-operator` | Identity Graph Operator | Operates a shared identity graph that multiple AI agents resolve against. Ensures every agent in a multi-agent system gets the same canonical answer for "who is this… |
| `specialized-korean-business-navigator` | Korean Business Navigator | Korean business culture for foreign professionals — 품의 decision process, nunchi reading, KakaoTalk business etiquette, hierarchy navigation, and relationship-first… |
| `lsp-index-engineer` | LSP/Index Engineer | Language Server Protocol specialist building unified code intelligence systems through LSP client orchestration and semantic indexing |
| `language-translator` | Language Translator | Real-time Spanish ↔ English translation specialist with cultural context, regional dialect awareness, travel phrase guidance, and tone-appropriate communication for… |
| `legal-billing-time-tracking` | Legal Billing & Time Tracking | Comprehensive legal billing and time tracking specialist for accurate time capture, invoice generation, billing narrative writing, collections management, trust… |
| `legal-client-intake` | Legal Client Intake | Comprehensive legal client intake specialist for qualifying prospects, collecting case information, scheduling consultations, managing conflict checks, and delivering… |
| `legal-document-review` | Legal Document Review | Comprehensive legal document review specialist for contracts, litigation documents, and real estate agreements — summarizing documents, flagging risk clauses,… |
| `loan-officer-assistant` | Loan Officer Assistant | Comprehensive loan officer assistant for mortgage and lending professionals — covering borrower intake, pre-qualification, document collection, pipeline management,… |
| `ma-integration-manager` | M&A Integration Manager | Mergers and acquisitions integration specialist who designs and executes post-merger integration programs — covering Day 1 readiness, 100-day planning, synergy… |
| `specialized-mcp-builder` | MCP Builder | Expert Model Context Protocol developer who designs, builds, and tests MCP servers that extend AI agent capabilities with custom tools, resources, and prompts. |
| `specialized-master-plan-architect` | Master Plan Architect | Master planning architect, technical educator, and ruthless plan critic who specializes in deep architectural teaching, Red Teaming / risk critique, and crafting… |
| `medical-billing-coding-specialist` | Medical Billing & Coding Specialist | Expert medical billing and coding specialist for ICD-10-CM/PCS, CPT, and HCPCS coding, claim submission, denial management, revenue cycle optimization, compliance… |
| `specialized-model-qa` | Model QA Specialist | Independent model QA expert who audits ML and statistical models end-to-end - from documentation review and data reconstruction to replication, calibration testing,… |
| `operations-manager` | Operations Manager | Business operations specialist who applies Lean, Six Sigma, and systems thinking to process mapping, capacity planning, KPI governance, vendor management, and… |
| `organizational-psychologist` | Organizational Psychologist | Applied organizational psychologist who diagnoses team dynamics, psychological safety, burnout risk, and culture health — using evidence-based frameworks to help… |
| `personal-growth-mentor` | Personal Growth Mentor | Cross-domain personal development mentor for goal clarity, habit design, strategic decisions, and accountability without motivational fluff. |
| `specialized-pricing-analyst` | Pricing Analyst | Specialized pricing analyst who develops optimal pricing models through market research, competitor analysis, cost structure evaluation, and margin optimization —… |
| `real-estate-buyer-seller` | Real Estate Buyer & Seller | Comprehensive real estate agent assistant for buyer representation, seller representation, listing management, offer negotiation, transaction coordination, and… |
| `recruitment-specialist` | Recruitment Specialist | Expert recruitment operations and talent acquisition specialist — skilled in China's major hiring platforms, talent assessment frameworks, and labor law compliance.… |
| `report-distribution-agent` | Report Distribution Agent | AI agent that automates distribution of consolidated sales reports to representatives based on territorial parameters |
| `resume-tailor` | Resume Tailor | Candidate-side resume optimization specialist who analyzes job descriptions, maps real experience to role requirements, improves ATS keyword alignment, and rewrites… |
| `retail-customer-returns` | Retail Customer Returns | Comprehensive retail customer returns specialist for processing returns, exchanges, and refunds across in-store, online, and omnichannel retail — handling policy… |
| `sales-data-extraction-agent` | Sales Data Extraction Agent | AI agent specialized in monitoring Excel files and extracting key sales metrics (MTD, YTD, Year End) for internal live reporting |
| `sales-outreach` | Sales Outreach | Consultative B2B sales outreach specialist for cold prospecting, lead follow-up, objection handling, proposal writing, and pipeline management — combining data-driven… |
| `specialized-salesforce-architect` | Salesforce Architect | Solution architecture for Salesforce platform — multi-cloud design, integration patterns, governor limits, deployment strategy, and data model governance for… |
| `specialized-strategy-duel-agent` | Strategy Duel Agent | Conducts live strategy duels using game theory and the 36 Chinese stratagems |
| `study-abroad-advisor` | Study Abroad Advisor | Full-spectrum study abroad planning expert covering the US, UK, Canada, Australia, Europe, Hong Kong, and Singapore — proficient in undergraduate, master's, and PhD… |
| `supply-chain-strategist` | Supply Chain Strategist | Expert supply chain management and procurement strategy specialist — skilled in supplier development, strategic sourcing, quality control, and supply chain… |
| `specialized-workflow-architect` | Workflow Architect | Workflow design specialist who maps complete workflow trees for every system, user journey, and agent interaction — covering happy paths, all branch conditions,… |
| `zk-steward` | ZK Steward | Knowledge-base steward in the spirit of Niklas Luhmann's Zettelkasten. Default perspective: Luhmann; switches to domain experts (Feynman, Munger, Ogilvy, etc.) by… |
