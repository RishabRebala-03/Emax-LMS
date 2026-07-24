import React, { useState } from "react";
import "./InterviewPrep.css";

interface Question {
  id: number;
  section: string;
  question: string;
  answer: string;
  practicalExample: string;
}

const SECTIONS = [
  { name: "ABAP Dictionary", range: "1–10", count: 10 },
  { name: "Internal Tables and Open SQL", range: "11–20", count: 10 },
  { name: "Reports, ALV and Dialog Programming", range: "21–30", count: 10 },
  { name: "Interfaces, Forms and Enhancements", range: "31–40", count: 10 },
  { name: "OO ABAP, Performance and Debugging", range: "41–54", count: 14 },
  { name: "S/4HANA, CDS, RAP and ABAP Cloud", range: "55–69", count: 15 },
  { name: "Real-Time Scenario Questions", range: "70–75", count: 6 },
];

const ALL_QUESTIONS: Question[] = [
  // ── ABAP Dictionary ──────────────────────────────────────────────────────────
  {
    id: 1,
    section: "ABAP Dictionary",
    question: "What is the difference between a Domain and a Data Element?",
    answer:
      "A Domain defines the technical attributes of a field: data type, length, decimal places, fixed values, value table and conversion routine. A Data Element gives the field its business meaning through labels, documentation, search help assignment and a reference to a Domain. One Domain can be reused by many Data Elements, but a Data Element refers to only one Domain at a time.",
    practicalExample:
      "A custom employee ID domain may be CHAR 10. The data element adds labels such as Employee ID and can then be reused in employee master, attendance and payroll tables.",
  },
  {
    id: 2,
    section: "ABAP Dictionary",
    question:
      "What is the difference between a transparent table, pooled table and cluster table?",
    answer:
      "A transparent table has a one-to-one relationship with a physical database table. Pooled and cluster tables were historical storage techniques that combined multiple logical tables in fewer physical database tables. In SAP S/4HANA, pooled and cluster table concepts are no longer supported in the same way; relevant application tables are represented as transparent structures to support HANA-optimized access.",
    practicalExample:
      "BSEG was historically a cluster table in classic systems. In S/4HANA, it is handled as a transparent table and must be accessed using supported S/4HANA data models and compatibility views where applicable.",
  },
  {
    id: 3,
    section: "ABAP Dictionary",
    question: "What are the main types of views in the ABAP Dictionary?",
    answer:
      "The traditional Dictionary view types are Database View, Projection View, Maintenance View and Help View. A Database View joins transparent tables at database level. A Projection View exposes selected fields from one table. A Maintenance View supports joint maintenance of related tables. A Help View supports search-help data selection. Modern development normally prefers CDS view entities for reusable semantic data models.",
    practicalExample:
      "A maintenance view can be used to maintain header and text tables together through SM30.",
  },
  {
    id: 4,
    section: "ABAP Dictionary",
    question: "What are Technical Settings of a database table?",
    answer:
      "Technical Settings control physical and runtime behavior such as data class, size category, buffering and change logging. Data class identifies the broad usage pattern, while size category estimates expected storage growth. Buffering may reduce database calls for suitable read-mostly tables.",
    practicalExample:
      "A small customizing table may use full buffering, while a high-volume transaction table should normally remain unbuffered.",
  },
  {
    id: 5,
    section: "ABAP Dictionary",
    question: "What is table buffering and when should it be avoided?",
    answer:
      "Table buffering keeps table records in the application-server buffer so repeated reads do not always hit the database. It is suitable for small, read-mostly, rarely changed tables. Avoid it for large transaction tables, frequently updated data, records that require immediate consistency, or tables mainly read with complex joins and aggregations.",
    practicalExample:
      "Buffering a sales-order item table would be inappropriate because the data changes frequently and can be very large.",
  },
  {
    id: 6,
    section: "ABAP Dictionary",
    question: "What is a Lock Object?",
    answer:
      "A Lock Object defines a logical SAP lock over one or more table records. Activating it generates ENQUEUE_<name> and DEQUEUE_<name> function modules. The enqueue server coordinates locks across application servers and prevents conflicting updates before the database commit.",
    practicalExample:
      "Before changing a custom purchase request, the program locks the request key. If another user already holds the lock, the second user receives a meaningful message instead of overwriting data.",
  },
  {
    id: 7,
    section: "ABAP Dictionary",
    question:
      "What is the difference between an elementary and a collective search help?",
    answer:
      "An elementary search help defines one search path, selection method, parameters and dialog behavior. A collective search help groups multiple elementary search helps so users can choose among different search strategies. Search-help exits can be used for specialized filtering or result manipulation.",
    practicalExample:
      "A vendor search can offer separate tabs for search by vendor name, tax number or city.",
  },
  {
    id: 8,
    section: "ABAP Dictionary",
    question: "What is a foreign-key relationship in SE11?",
    answer:
      "A foreign key links fields in a dependent table to key fields in a check table and documents the semantic relationship. It helps input validation, value help generation and consistency checks. Cardinality describes how many dependent records can correspond to a check-table record.",
    practicalExample:
      "Plant in a custom material table can be checked against T001W so invalid plants cannot be entered.",
  },
  {
    id: 9,
    section: "ABAP Dictionary",
    question: "What is a Table Maintenance Generator?",
    answer:
      "The Table Maintenance Generator creates standard maintenance dialogs for custom tables or maintenance views. It is generated from SE11 and executed through SM30. Authorization group, function group, maintenance type and recording routine should be configured carefully.",
    practicalExample:
      "Use TMG for controlled maintenance of a small custom configuration table, not as a substitute for a transactional application.",
  },
  {
    id: 10,
    section: "ABAP Dictionary",
    question: "What is Delivery Class and why is it important?",
    answer:
      "Delivery Class controls the ownership and transport behavior of table contents during installation, upgrades, client copies and transports. Common classes include A for application data, C for customer customizing and L for temporary data. The chosen class should match the table's lifecycle and transport requirements.",
    practicalExample:
      "A company-specific configuration table normally uses a customizing-oriented delivery class and records changes in transport requests.",
  },

  // ── Internal Tables and Open SQL ─────────────────────────────────────────────
  {
    id: 11,
    section: "Internal Tables and Open SQL",
    question: "Explain Standard, Sorted and Hashed internal tables.",
    answer:
      "A Standard table is index-based and is suitable for append-heavy processing and sequential access. A Sorted table stays sorted by its key and supports efficient key access and range loops. A Hashed table uses a unique hash key and provides near-constant-time exact-key reads, but no index access.",
    practicalExample:
      "Use a hashed table keyed by material and plant for repeated exact lookups during validation; use a sorted table when you also need ordered or partial-key processing.",
  },
  {
    id: 12,
    section: "Internal Tables and Open SQL",
    question:
      "What is the difference between WITH KEY and WITH TABLE KEY in READ TABLE?",
    answer:
      "WITH KEY specifies a free key and may use an optimized key if the runtime can identify one. WITH TABLE KEY explicitly addresses the primary or a named secondary table key. For sorted and hashed tables, using the correct table key gives predictable optimized access.",
    practicalExample:
      "If a hashed table has key VBELN and POSNR, READ TABLE ... WITH TABLE KEY vbeln = ... posnr = ... is the clearest exact lookup.",
  },
  {
    id: 13,
    section: "Internal Tables and Open SQL",
    question: "What are secondary keys in internal tables?",
    answer:
      "Secondary keys provide additional sorted or hashed access paths on one internal table without maintaining duplicate tables manually. They can improve repeated lookups and loops by alternative field combinations, although they consume memory and add maintenance cost during inserts and updates.",
    practicalExample:
      "An item table can have a primary key by document/item and a secondary sorted key by material for material-wise processing.",
  },
  {
    id: 14,
    section: "Internal Tables and Open SQL",
    question:
      "What is FOR ALL ENTRIES and what happens if the driver table is empty?",
    answer:
      "FOR ALL ENTRIES builds a database selection using values from an internal table. Duplicate result rows may be removed according to the selected columns. The driver table must be checked for IS NOT INITIAL; otherwise the FOR ALL ENTRIES condition is ignored and the database can return all rows matching the remaining WHERE conditions.",
    practicalExample:
      "Always remove unnecessary duplicates from the driver table and guard the SELECT with IF lt_keys IS NOT INITIAL.",
  },
  {
    id: 15,
    section: "Internal Tables and Open SQL",
    question: "When would you choose a JOIN instead of FOR ALL ENTRIES?",
    answer:
      "Prefer a database JOIN when the relationship is clear and the required data can be retrieved in one set-based statement. It lets the database optimizer perform the join and usually reduces network round trips. FOR ALL ENTRIES is useful when the driving data already exists in memory or when a direct join is impractical, but it requires empty-table protection and careful key selection.",
    practicalExample:
      "To read sales-order headers and items, an INNER JOIN between VBAK and VBAP is usually clearer than two separate SELECT statements.",
  },
  {
    id: 16,
    section: "Internal Tables and Open SQL",
    question: "What is the difference between SELECT SINGLE and UP TO 1 ROWS?",
    answer:
      "SELECT SINGLE is appropriate when one row is expected, ideally through a full unique key. UP TO 1 ROWS is appropriate when several rows can match and you intentionally choose one, commonly with ORDER BY. Without a unique key or ORDER BY, the selected row is not a reliable business choice.",
    practicalExample:
      "To retrieve the latest billing document, use ORDER BY billing date DESCENDING UP TO 1 ROWS rather than an unconstrained SELECT SINGLE.",
  },
  {
    id: 17,
    section: "Internal Tables and Open SQL",
    question: "Why should SELECT * be avoided?",
    answer:
      "SELECT * transfers every column even when the program needs only a few. This increases database work, network traffic, memory use and coupling to the table structure. Select only required fields and aggregate at database level where possible.",
    practicalExample:
      "A report needing material, plant and status should not read all columns of a wide master-data table.",
  },
  {
    id: 18,
    section: "Internal Tables and Open SQL",
    question: "What are inline declarations and constructor expressions?",
    answer:
      "Modern ABAP supports inline declarations such as DATA(result), FIELD-SYMBOL(<row>) and FINAL(value). Constructor expressions such as VALUE, NEW, CORRESPONDING, CONV, FILTER, REDUCE and FOR make transformations more expressive. They should improve readability, not compress complex logic into unreadable statements.",
    practicalExample:
      "VALUE #( FOR item IN lt_items WHERE ( status = 'A' ) ( item ) ) can create a filtered result table.",
  },
  {
    id: 19,
    section: "Internal Tables and Open SQL",
    question: "How do you remove duplicates efficiently from an internal table?",
    answer:
      "For a Standard table, sort by the relevant comparison fields and use DELETE ADJACENT DUPLICATES COMPARING those fields. Alternatively, build a Sorted or Hashed table with a unique key so duplicates are rejected during insertion. Choose based on whether order, duplicate detection or exact-key access is required.",
    practicalExample:
      "When creating a list of unique customers from sales items, use a unique sorted table keyed by customer.",
  },
  {
    id: 20,
    section: "Internal Tables and Open SQL",
    question: "How would you optimize a slow Open SQL statement?",
    answer:
      "First measure using SQL Monitor, ST05, SAT or SQL trace information. Check selectivity, WHERE conditions, indexes, unnecessary columns, row counts and repeated calls. Replace row-by-row access with set-based joins or aggregations, push filtering to the database and verify the execution plan before adding a new index.",
    practicalExample:
      "A statement called 20,000 times inside a loop is often fixed by reading all required records once into a keyed internal table.",
  },

  // ── Reports, ALV and Dialog Programming ──────────────────────────────────────
  {
    id: 21,
    section: "Reports, ALV and Dialog Programming",
    question: "What are the important events of an executable report?",
    answer:
      "Common events are LOAD-OF-PROGRAM, INITIALIZATION, AT SELECTION-SCREEN OUTPUT, AT SELECTION-SCREEN, START-OF-SELECTION and END-OF-SELECTION. Classical list events include TOP-OF-PAGE and END-OF-PAGE. Modern reports often keep event blocks small and delegate logic to classes.",
    practicalExample:
      "Use AT SELECTION-SCREEN for input validation and START-OF-SELECTION to trigger the main processing flow.",
  },
  {
    id: 22,
    section: "Reports, ALV and Dialog Programming",
    question: "What is the difference between a classical and interactive report?",
    answer:
      "A classical report normally produces a primary list. An interactive report allows users to select a line and navigate to secondary lists or transactions using events such as AT LINE-SELECTION or user commands. For new applications, ALV or Fiori applications usually provide a better user experience.",
    practicalExample:
      "Selecting a customer total in the first list can display the customer's invoice details in a secondary list.",
  },
  {
    id: 23,
    section: "Reports, ALV and Dialog Programming",
    question:
      "What is the difference between REUSE_ALV_GRID_DISPLAY, CL_GUI_ALV_GRID and CL_SALV_TABLE?",
    answer:
      "REUSE_ALV_GRID_DISPLAY is a procedural legacy function module. CL_GUI_ALV_GRID is a flexible control that supports editing and advanced event handling. CL_SALV_TABLE provides a simpler object-oriented display API but is primarily intended for non-editable lists. New development should avoid unnecessary dependence on obsolete procedural APIs.",
    practicalExample:
      "Use CL_GUI_ALV_GRID when users must edit quantities and trigger validation before saving.",
  },
  {
    id: 24,
    section: "Reports, ALV and Dialog Programming",
    question: "How do you create an editable ALV?",
    answer:
      "Use CL_GUI_ALV_GRID, mark editable columns in the field catalog and register the appropriate edit events. Handle DATA_CHANGED and DATA_CHANGED_FINISHED to validate values and update the internal table. Perform authorization checks and save changes through proper business APIs or controlled database logic.",
    practicalExample:
      "When a planner edits a proposed delivery date, validate factory calendar and order status before accepting the change.",
  },
  {
    id: 25,
    section: "Reports, ALV and Dialog Programming",
    question:
      "How do you implement hotspots and double-click actions in ALV?",
    answer:
      "Mark the relevant field as a hotspot and register event-handler methods for hotspot_click or double_click. The handler receives row and column information, allowing the program to navigate to a transaction, open a detail screen or show a popup.",
    practicalExample:
      "Clicking a sales-order number can call VA03 with SET PARAMETER ID and CALL TRANSACTION, subject to authorization.",
  },
  {
    id: 26,
    section: "Reports, ALV and Dialog Programming",
    question: "What is an ALV field catalog?",
    answer:
      "The field catalog describes how each output field is displayed: column text, length, technical status, key status, editability, currency/unit reference, hotspot behavior and aggregation. It can be generated from a DDIC structure or built programmatically.",
    practicalExample:
      "For an amount field, set the currency reference so ALV formats decimal places correctly for each currency.",
  },
  {
    id: 27,
    section: "Reports, ALV and Dialog Programming",
    question: "How are totals and subtotals implemented in ALV?",
    answer:
      "Set the aggregation flag for numeric fields and provide sort criteria with subtotal indicators for grouping fields. Ensure the data type and currency or unit references are correct. Totals should represent meaningful business measures rather than blindly summing every numeric field.",
    practicalExample:
      "Sort by sales organization with subtotal enabled and total the net value field.",
  },
  {
    id: 28,
    section: "Reports, ALV and Dialog Programming",
    question: "Explain PBO and PAI in module-pool programming.",
    answer:
      "PBO, Process Before Output, prepares the screen before display, including status, title, field attributes and initial values. PAI, Process After Input, handles user commands, validations and navigation after the user submits the screen. Screen flow logic calls ABAP modules defined in the module pool.",
    practicalExample:
      "In PBO, disable an approval field for unauthorized users. In PAI, validate entered data before saving.",
  },
  {
    id: 29,
    section: "Reports, ALV and Dialog Programming",
    question: "What is CHAIN...ENDCHAIN?",
    answer:
      "CHAIN...ENDCHAIN groups multiple screen fields for collective validation in PAI. A FIELD statement assigns fields to the chain and a MODULE performs validation. When a chain validation fails, the grouped fields can be made ready for correction together.",
    practicalExample:
      "Validate company code, plant and purchasing organization as one dependent input group.",
  },
  {
    id: 30,
    section: "Reports, ALV and Dialog Programming",
    question: "What are POV and POH events?",
    answer:
      "PROCESS ON VALUE-REQUEST handles custom F4 value help. PROCESS ON HELP-REQUEST handles custom F1 help. Prefer DDIC search helps and data-element documentation where they meet the requirement; use POV or POH for screen-specific behavior.",
    practicalExample:
      "A POV module can restrict available storage locations based on the plant already entered on the screen.",
  },

  // ── Interfaces, Forms and Enhancements ───────────────────────────────────────
  {
    id: 31,
    section: "Interfaces, Forms and Enhancements",
    question: "What is the difference between CALL TRANSACTION and BDC Session?",
    answer:
      "CALL TRANSACTION processes a transaction immediately and can run in display, error-only or background mode. Session method creates a batch-input session processed later through SM35, offering restartability and detailed logs. Both are screen-dependent and should be used only when a stable business API is not available.",
    practicalExample:
      "For a small controlled upload CALL TRANSACTION may be acceptable; for a large legacy migration a session can provide better restart and audit handling.",
  },
  {
    id: 32,
    section: "Interfaces, Forms and Enhancements",
    question: "When should a BAPI be preferred over BDC?",
    answer:
      "Prefer a released BAPI or business API because it works at business-object level, validates data consistently and is less sensitive to screen changes. BDC should be a fallback when no supported API exists. Always check return messages and execute the documented commit procedure.",
    practicalExample:
      "Use BAPI_PO_CREATE1 for purchase-order creation instead of recording ME21N screens.",
  },
  {
    id: 33,
    section: "Interfaces, Forms and Enhancements",
    question: "Explain RFC, tRFC, qRFC and bgRFC.",
    answer:
      "Synchronous RFC waits for the remote call to finish. Transactional RFC guarantees eventual execution of a logical unit but not strict sequence. Queued RFC adds ordered processing through queues. bgRFC is the newer background RFC framework for reliable, scalable asynchronous units. The choice depends on response-time, reliability and ordering requirements.",
    practicalExample:
      "Use qRFC when warehouse messages must be processed in exactly the sequence in which they were generated.",
  },
  {
    id: 34,
    section: "Interfaces, Forms and Enhancements",
    question: "What is an IDoc and what are its main components?",
    answer:
      "An IDoc is a structured SAP message for asynchronous integration. It contains a control record, data segments and status records. Message type expresses the business meaning; basic type defines the technical segment structure; process codes connect inbound or outbound processing logic.",
    practicalExample:
      "A purchase-order IDoc may carry header, partner, item and schedule-line segments and later record statuses such as created, sent or failed.",
  },
  {
    id: 35,
    section: "Interfaces, Forms and Enhancements",
    question: "How do you debug a failed inbound IDoc?",
    answer:
      "Review WE02 or WE05 for status and segment content, then check partner profile, process code, message type and application log. Reprocess with BD87 after correcting the root cause. For debugging, set an external or session breakpoint in the inbound function module and process a test copy where permitted.",
    practicalExample:
      "Status 51 usually indicates an application error; the status text and application log provide the first diagnostic clue.",
  },
  {
    id: 36,
    section: "Interfaces, Forms and Enhancements",
    question: "How do you consume a REST API from ABAP?",
    answer:
      "Create an HTTP client using the supported destination or communication arrangement, set method, headers and payload, execute the request, check HTTP status and deserialize JSON. Handle TLS, authentication, timeouts, retries and sensitive credentials securely. In ABAP Cloud, use released communication APIs and destination services.",
    practicalExample:
      "An application can call a logistics API, parse JSON tracking events and update a staging table after successful validation.",
  },
  {
    id: 37,
    section: "Interfaces, Forms and Enhancements",
    question:
      "What is the difference between SAPscript, Smart Forms and Adobe Forms?",
    answer:
      "SAPscript is the oldest text-oriented form technology. Smart Forms provides a graphical form builder and generates a function module at activation. Adobe Forms supports interactive and high-fidelity PDF scenarios through Adobe Document Services. The selection depends on existing landscape, output requirements and strategic roadmap.",
    practicalExample:
      "For a complex interactive PDF with input fields, Adobe Forms is generally more suitable than Smart Forms.",
  },
  {
    id: 38,
    section: "Interfaces, Forms and Enhancements",
    question:
      "What is the difference between User Exit, Customer Exit and BAdI?",
    answer:
      "User Exit is an older enhancement technique, often implemented in SAP-provided includes. Customer Exits are managed through enhancement projects and can include function, menu and screen exits. BAdIs are object-oriented enhancement points and may support multiple implementations and filters. Prefer supported enhancement frameworks over direct modification.",
    practicalExample:
      "For a modern purchasing enhancement, identify a suitable BAdI before considering implicit enhancement or modification.",
  },
  {
    id: 39,
    section: "Interfaces, Forms and Enhancements",
    question: "What are explicit and implicit enhancements?",
    answer:
      "Explicit enhancements are intentionally provided by SAP through enhancement points, sections or spots. Implicit enhancements exist at predefined structural locations such as the beginning or end of methods, function modules and includes. Explicit enhancements are usually safer because the extension contract is clearer.",
    practicalExample:
      "Use an explicit enhancement point supplied by SAP rather than inserting logic at the end of a standard include through an implicit enhancement.",
  },
  {
    id: 40,
    section: "Interfaces, Forms and Enhancements",
    question: "How do you find an appropriate BAdI for a transaction?",
    answer:
      "Start with application documentation and the enhancement repository. Use SE18/SE19, repository search, package inspection, debugging and call-stack analysis. Runtime techniques such as breakpoints in BAdI framework classes can help, but the final choice must be validated against interface purpose and lifecycle.",
    practicalExample:
      "Do not select a BAdI only because it is called during the transaction; confirm it is intended for the business requirement and executes at the correct phase.",
  },

  // ── OO ABAP, Performance and Debugging ───────────────────────────────────────
  {
    id: 41,
    section: "OO ABAP, Performance and Debugging",
    question:
      "Explain encapsulation, inheritance and polymorphism in ABAP Objects.",
    answer:
      "Encapsulation hides internal state behind public methods. Inheritance allows a subclass to reuse and specialize superclass behavior. Polymorphism lets code work with a superclass or interface reference while executing the concrete implementation at runtime. Favor interfaces and composition when they reduce coupling.",
    practicalExample:
      "A payment interface can have separate implementations for bank transfer and card payment, while the caller uses one common method.",
  },
  {
    id: 42,
    section: "OO ABAP, Performance and Debugging",
    question: "What is the difference between instance and static components?",
    answer:
      "Instance attributes and methods belong to an object and are accessed through ->. Static components belong to the class and are accessed through =>. Static state is shared within the internal session, so it should be used carefully to avoid hidden dependencies and testing difficulties.",
    practicalExample:
      "A utility conversion method can be static, while a sales-order service with per-request state should be instantiated.",
  },
  {
    id: 43,
    section: "OO ABAP, Performance and Debugging",
    question: "What is the difference between an interface and an abstract class?",
    answer:
      "An interface defines a contract without instance implementation state. An abstract class can provide common implementation, protected state and abstract methods for subclasses. A class can implement multiple interfaces but can inherit from only one superclass.",
    practicalExample:
      "Use an interface for interchangeable tax-calculation strategies; use an abstract base class when implementations share substantial protected logic.",
  },
  {
    id: 44,
    section: "OO ABAP, Performance and Debugging",
    question: "What is exception handling in modern ABAP?",
    answer:
      "Class-based exceptions derive from CX_ROOT and are raised with RAISE EXCEPTION TYPE or propagated through RAISING clauses. Catch only exceptions you can handle, preserve meaningful context and avoid converting every error into a generic text message. Cleanup blocks can release resources.",
    practicalExample:
      "A REST client may raise a specific communication exception containing HTTP status and response details, while the caller decides whether to retry.",
  },
  {
    id: 45,
    section: "OO ABAP, Performance and Debugging",
    question: "What is the Singleton pattern and when should it be avoided?",
    answer:
      "A Singleton restricts a class to one instance and exposes a controlled access method. It can be useful for stateless registries or expensive shared resources, but often introduces global state and makes unit testing difficult. Dependency injection is usually more flexible.",
    practicalExample:
      "A configuration cache may be implemented as a singleton, but business services should generally be passed explicitly to consumers.",
  },
  {
    id: 46,
    section: "OO ABAP, Performance and Debugging",
    question: "What is the Parallel Cursor technique?",
    answer:
      "Parallel Cursor reduces the cost of nested processing over two sorted internal tables. After sorting both tables by the common key, the inner loop starts from the last relevant index rather than scanning from the beginning each time. Modern alternatives include hashed tables, secondary keys and GROUP BY loops.",
    practicalExample:
      "For each sales-order header, process only its item range in a sorted item table instead of scanning every item repeatedly.",
  },
  {
    id: 47,
    section: "OO ABAP, Performance and Debugging",
    question: "Why is SELECT inside LOOP considered a performance risk?",
    answer:
      "It produces many database round trips and often repeats similar work. Replace it with one set-based SELECT using all keys, then read the result from a sorted or hashed internal table. A SELECT inside LOOP is not automatically wrong, but it must be justified and measured.",
    practicalExample:
      "Reading customer data separately for 10,000 invoice lines should be replaced with one bulk read of unique customer numbers.",
  },
  {
    id: 48,
    section: "OO ABAP, Performance and Debugging",
    question: "How do ST05, SAT and SQL Monitor differ?",
    answer:
      "ST05 traces database access and helps analyze SQL statements and execution behavior. SAT measures ABAP runtime and call hierarchy, including database and CPU time. SQL Monitor collects SQL execution statistics over a longer period to identify frequently executed and expensive statements in productive workloads.",
    practicalExample:
      "Use SQL Monitor to find high-impact statements, ST05 to inspect a specific SQL call and SAT to understand overall program time.",
  },
  {
    id: 49,
    section: "OO ABAP, Performance and Debugging",
    question: "How do you debug an update task?",
    answer:
      "Activate update debugging before the COMMIT WORK that triggers the update function module. The debugger then opens in the update work process. Also inspect SM13 for failed update records and ST22 for dumps. Never add COMMIT WORK inside update function modules.",
    practicalExample:
      "If a document appears saved but related data is missing, inspect the update records and debug the responsible update function module.",
  },
  {
    id: 50,
    section: "OO ABAP, Performance and Debugging",
    question: "Explain SAP LUW and Database LUW.",
    answer:
      "A Database LUW is the database unit between commit or rollback operations on one database connection. An SAP LUW can span multiple dialog steps and groups changes logically until COMMIT WORK coordinates update tasks and database commits. SAP locks help protect consistency across the longer SAP LUW.",
    practicalExample:
      "A multi-screen transaction can collect changes across several dialog steps and persist them together when the user saves.",
  },
  {
    id: 51,
    section: "OO ABAP, Performance and Debugging",
    question: "What is the difference between COMMIT WORK and COMMIT WORK AND WAIT?",
    answer:
      "COMMIT WORK closes the current SAP LUW and triggers registered update tasks asynchronously. COMMIT WORK AND WAIT waits for the high-priority update processing to finish and sets a return code. Use the wait variant only when subsequent logic genuinely depends on completion.",
    practicalExample:
      "After calling a creation BAPI, use the commit mechanism documented by that API, often BAPI_TRANSACTION_COMMIT with WAIT = 'X'.",
  },
  {
    id: 52,
    section: "OO ABAP, Performance and Debugging",
    question: "How do you investigate an ABAP short dump?",
    answer:
      "Use ST22 to read the runtime error, exception, source position, call stack and selected variables. Identify whether the root cause is code, data, authorization, resource exhaustion or integration. Reproduce safely, correct the underlying issue and verify related logs rather than treating the dump text alone as the solution.",
    practicalExample:
      "A TSV_TNEW_PAGE_ALLOC_FAILED dump indicates memory pressure; investigate data volume and table growth before increasing memory limits.",
  },
  {
    id: 53,
    section: "OO ABAP, Performance and Debugging",
    question: "How do you debug a background job?",
    answer:
      "Review SM37 job log, spool and step details. Use JDBG from the job overview for a controlled debug copy, or place an external breakpoint when the execution context supports it. Check job user authorizations, variants, server group and input files because background behavior can differ from dialog execution.",
    practicalExample:
      "A report that works online but fails in background may rely on frontend services, which are unavailable to background work processes.",
  },
  {
    id: 54,
    section: "OO ABAP, Performance and Debugging",
    question: "What are common ABAP memory and performance problems?",
    answer:
      "Typical causes are oversized internal tables, SELECT *, repeated table copies, nested loops, ineffective keys, excessive string concatenation, unbounded result sets and holding large references longer than needed. Measure before optimizing and reduce data as early as possible.",
    practicalExample:
      "Aggregate monthly totals in SQL instead of loading millions of line items into memory and summing them in ABAP.",
  },

  // ── S/4HANA, CDS, RAP and ABAP Cloud ────────────────────────────────────────
  {
    id: 55,
    section: "S/4HANA, CDS, RAP and ABAP Cloud",
    question: "What is code pushdown?",
    answer:
      "Code pushdown moves filtering, joins, calculations and aggregation to the database so less data is transferred to the application server. On SAP HANA this is implemented through efficient Open SQL, CDS views, table functions or AMDP when justified. Push down data-intensive logic, but keep business logic maintainable and portable where possible.",
    practicalExample:
      "Calculate sales totals by customer using GROUP BY in the database instead of reading every item and aggregating in ABAP.",
  },
  {
    id: 56,
    section: "S/4HANA, CDS, RAP and ABAP Cloud",
    question: "What is an ABAP CDS view entity?",
    answer:
      "A CDS view entity is a semantically rich data model defined in ADT using CDS DDL. It supports associations, annotations, expressions, access control and reuse by ABAP SQL and application frameworks. View entities are the modern successor to older DDIC-based CDS views and do not require a separately named SQL view.",
    practicalExample:
      "A sales-order consumption view can expose header, customer and calculated status fields with annotations for a Fiori application.",
  },
  {
    id: 57,
    section: "S/4HANA, CDS, RAP and ABAP Cloud",
    question: "What is the difference between a CDS view and a classic database view?",
    answer:
      "A classic database view mainly joins table fields and is maintained in SE11. CDS adds semantic annotations, associations, calculated elements, access control, extensibility and framework integration. CDS is therefore a reusable data model, not merely a technical join.",
    practicalExample:
      "A CDS view can define authorization behavior through DCL and UI metadata through annotations.",
  },
  {
    id: 58,
    section: "S/4HANA, CDS, RAP and ABAP Cloud",
    question: "What are associations in CDS?",
    answer:
      "Associations describe relationships between CDS entities and are consumed through path expressions. They can improve readability and reuse compared with repeating explicit joins. Cardinality should accurately reflect the data relationship because it can influence semantics and optimization.",
    practicalExample:
      "A sales-order item entity can associate to product and customer entities, allowing consumers to navigate only when those fields are needed.",
  },
  {
    id: 59,
    section: "S/4HANA, CDS, RAP and ABAP Cloud",
    question: "What is CDS access control using DCL?",
    answer:
      "Data Control Language defines role-based row-level restrictions for CDS entities. When authorization checking is enabled, consumers automatically receive only permitted records unless a documented privileged access mechanism is used. DCL complements, but does not replace, application authorization checks for actions.",
    practicalExample:
      "A company-code restriction can limit finance users to documents for authorized company codes.",
  },
  {
    id: 60,
    section: "S/4HANA, CDS, RAP and ABAP Cloud",
    question: "What is AMDP and when should it be used?",
    answer:
      "ABAP Managed Database Procedures let ABAP classes implement database procedures in SQLScript. Use AMDP for complex, data-intensive logic that cannot be expressed efficiently in Open SQL or CDS. It is HANA-specific, so the performance benefit must justify tighter database coupling and additional testing.",
    practicalExample:
      "A complex graph-like calculation over very large datasets may justify AMDP, while a normal join and aggregation usually should remain in CDS or Open SQL.",
  },
  {
    id: 61,
    section: "S/4HANA, CDS, RAP and ABAP Cloud",
    question: "What is a CDS table function?",
    answer:
      "A CDS table function defines a CDS entity whose result is implemented by an AMDP database function. It allows SQLScript logic to participate in CDS consumption. Use it sparingly when standard CDS expressions cannot meet the requirement.",
    practicalExample:
      "A table function can calculate a specialized hierarchy result and expose it to a higher-level CDS consumption view.",
  },
  {
    id: 62,
    section: "S/4HANA, CDS, RAP and ABAP Cloud",
    question: "What is RAP?",
    answer:
      "The ABAP RESTful Application Programming Model is SAP's model for building transactional Fiori applications and Web APIs using CDS data models, behavior definitions, behavior implementations, service definitions and service bindings. It supports HANA-optimized development and is central to ABAP Cloud.",
    practicalExample:
      "A travel-request application can define a RAP business object with create, update, delete, validations, actions and draft handling.",
  },
  {
    id: 63,
    section: "S/4HANA, CDS, RAP and ABAP Cloud",
    question: "What is the difference between managed and unmanaged RAP?",
    answer:
      "In managed RAP, the framework handles standard persistence operations and much of the transactional processing. In unmanaged RAP, the developer implements the save logic, often to reuse existing BAPIs, function modules or legacy persistence. Choose managed for new straightforward persistence and unmanaged when established business logic must remain authoritative.",
    practicalExample:
      "A new custom approval object can use managed RAP; a sales-order facade may use unmanaged RAP to call released sales-order APIs.",
  },
  {
    id: 64,
    section: "S/4HANA, CDS, RAP and ABAP Cloud",
    question: "What are validations, determinations and actions in RAP?",
    answer:
      "Validations check business consistency and can reject changes with reported messages. Determinations derive or update values automatically when defined triggers occur. Actions represent explicit business operations such as approve, reject or recalculate. Their implementation belongs in the behavior pool.",
    practicalExample:
      "Before saving a travel request, a validation checks that the end date is not before the start date; an action submits it for approval.",
  },
  {
    id: 65,
    section: "S/4HANA, CDS, RAP and ABAP Cloud",
    question: "What is draft handling in RAP?",
    answer:
      "Draft handling lets users save incomplete transactional changes without updating the active business object. RAP manages draft instances, locking, preparation and activation according to the behavior definition. It is useful for long-running, multi-step Fiori editing scenarios.",
    practicalExample:
      "A user can begin a complex supplier onboarding request, save the draft and complete it later before activation.",
  },
  {
    id: 66,
    section: "S/4HANA, CDS, RAP and ABAP Cloud",
    question: "What is EML in RAP?",
    answer:
      "Entity Manipulation Language is an ABAP language syntax for reading and modifying RAP business objects within ABAP. It respects the business object's behavior contract and supports operations such as READ ENTITIES, MODIFY ENTITIES and COMMIT ENTITIES in appropriate contexts.",
    practicalExample:
      "A background process can execute a RAP action for selected business-object instances through EML rather than updating persistence tables directly.",
  },
  {
    id: 67,
    section: "S/4HANA, CDS, RAP and ABAP Cloud",
    question: "What is ABAP Cloud?",
    answer:
      "ABAP Cloud is SAP's cloud-ready development model using a restricted, cloud-optimized ABAP language version, ADT, released APIs and upgrade-stable extension techniques. It is used in SAP BTP ABAP environment and can also be applied in supported S/4HANA environments.",
    practicalExample:
      "A new extension consumes released business objects and APIs instead of directly accessing unreleased SAP tables or function modules.",
  },
  {
    id: 68,
    section: "S/4HANA, CDS, RAP and ABAP Cloud",
    question: "What does Clean Core mean for an ABAP developer?",
    answer:
      "Clean Core means minimizing modifications and keeping extensions upgrade-stable through released APIs, approved extension points and side-by-side or on-stack extensibility options. Custom code should be decoupled from SAP internals, continuously checked and designed for lifecycle stability.",
    practicalExample:
      "Instead of modifying a standard include, implement a released BAdI or build a RAP extension using released interfaces.",
  },
  {
    id: 69,
    section: "S/4HANA, CDS, RAP and ABAP Cloud",
    question: "How do ATC and released APIs support cloud-ready development?",
    answer:
      "ABAP Test Cockpit checks syntax, security, performance, S/4HANA readiness and use of restricted or unreleased objects. In ABAP Cloud language version, only released APIs are consumable. Together they prevent fragile dependencies and identify remediation work early.",
    practicalExample:
      "Before migration, run ATC with an S/4HANA or cloud-readiness check variant and replace obsolete statements and unreleased accesses.",
  },

  // ── Real-Time Scenario Questions ──────────────────────────────────────────────
  {
    id: 70,
    section: "Real-Time Scenario Questions",
    question: "A report takes 40 seconds. How would you reduce the runtime?",
    answer:
      "Reproduce with representative data, then use SAT and ST05 or SQL Monitor to identify where time is spent. Reduce selected columns and rows, eliminate repeated SQL, replace nested processing with keyed tables, push aggregation to the database and retest. Do not add indexes or AMDP before evidence shows they are needed.",
    practicalExample:
      "A trace may reveal that 85% of runtime comes from one SELECT inside a 15,000-row loop; replacing it with one bulk SELECT can produce the largest improvement.",
  },
  {
    id: 71,
    section: "Real-Time Scenario Questions",
    question: "A transport works in DEV but dumps in QA. What do you check?",
    answer:
      "Check the QA dump in ST22, transport logs, object versions, inactive objects, missing dependent transports, configuration differences, authorizations and data assumptions. Compare package and DDIC activation status and ensure transports were imported in the correct sequence.",
    practicalExample:
      "A program may compile in DEV because a dependent data element exists locally but fail in QA because its transport was not included.",
  },
  {
    id: 72,
    section: "Real-Time Scenario Questions",
    question: "A BAPI returns success, but the data is not visible. What could be wrong?",
    answer:
      "Check the BAPI RETURN table, required commit call, update-task failures in SM13, locks, buffering and whether the BAPI only simulated the transaction. Use the BAPI's documented transaction model; do not insert an arbitrary COMMIT inside reusable lower-level code.",
    practicalExample:
      "Many creation BAPIs require BAPI_TRANSACTION_COMMIT after a successful call.",
  },
  {
    id: 73,
    section: "Real-Time Scenario Questions",
    question:
      "Two users update the same document and one overwrites the other. How do you fix it?",
    answer:
      "Introduce an SAP logical lock before reading or changing the document, retain it for the business transaction and release it after commit or rollback. Validate stale data where necessary and return a user-friendly lock-owner message. Database updates alone do not provide the same cross-screen business lock behavior.",
    practicalExample:
      "Lock by document number at edit start and prevent a second user from entering change mode.",
  },
  {
    id: 74,
    section: "Real-Time Scenario Questions",
    question:
      "A custom program uses a table that changed in S/4HANA. How do you remediate it?",
    answer:
      "Run ATC and simplification checks, identify the supported replacement object or compatibility view, then adjust code to use the new data model or released API. Revalidate semantics because field availability and aggregation behavior may differ from ECC.",
    practicalExample:
      "A finance report should use the S/4HANA universal-journal model and released views rather than assuming classic aggregate tables remain authoritative.",
  },
  {
    id: 75,
    section: "Real-Time Scenario Questions",
    question: "A CDS view is slow in production. How do you analyze it?",
    answer:
      "Check the SQL plan and runtime statistics, filters supplied by consumers, association cardinalities, calculated fields, nested view stack and authorization conditions. Reduce unnecessary layers, expose selective filters, avoid expensive calculations on large unfiltered datasets and validate with production-like volumes.",
    practicalExample:
      "A consumption view may be slow because a nonselective association and calculated conversion are executed before the user filter is applied.",
  },
];

type FilterType = "all" | string;

const InterviewPrep: React.FC = () => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [revealAnswer, setRevealAnswer] = useState(false);
  const [filterSection, setFilterSection] = useState<FilterType>("all");
  const [jumpInput, setJumpInput] = useState("");

  const filteredQuestions =
    filterSection === "all"
      ? ALL_QUESTIONS
      : ALL_QUESTIONS.filter((q) => q.section === filterSection);

  const total = filteredQuestions.length;
  const question = filteredQuestions[currentIndex] ?? filteredQuestions[0];

  const goTo = (index: number) => {
    const clamped = Math.max(0, Math.min(index, total - 1));
    setCurrentIndex(clamped);
    setRevealAnswer(false);
    setJumpInput("");
  };

  const handleSectionChange = (section: FilterType) => {
    setFilterSection(section);
    setCurrentIndex(0);
    setRevealAnswer(false);
  };

  const handleJump = (e: React.FormEvent) => {
    e.preventDefault();
    const num = parseInt(jumpInput, 10);
    if (!isNaN(num) && num >= 1 && num <= total) {
      goTo(num - 1);
    }
  };

  const sectionColor: Record<string, string> = {
    "ABAP Dictionary": "#0070f2",
    "Internal Tables and Open SQL": "#8B5CF6",
    "Reports, ALV and Dialog Programming": "#059669",
    "Interfaces, Forms and Enhancements": "#D97706",
    "OO ABAP, Performance and Debugging": "#DC2626",
    "S/4HANA, CDS, RAP and ABAP Cloud": "#0891B2",
    "Real-Time Scenario Questions": "#7C3AED",
  };

  const currentColor = sectionColor[question.section] ?? "#0070f2";
  const progress = total > 0 ? ((currentIndex + 1) / total) * 100 : 0;

  return (
    <div className="ip-page">
      {/* ── Header ── */}
      <div className="ip-header">
        <div className="ip-header-left">
          <h1 className="ip-title">Interview Preparation</h1>
          <p className="ip-subtitle">
            SAP ABAP · 75 Questions · 2026 Edition
          </p>
        </div>
        <div className="ip-header-right">
          <span className="ip-edition-badge">2026 Edition</span>
        </div>
      </div>

      {/* ── Section Filter ── */}
      <div className="ip-filters">
        <button
          className={`ip-filter-chip ${filterSection === "all" ? "active" : ""}`}
          onClick={() => handleSectionChange("all")}
          style={filterSection === "all" ? { borderColor: "#0070f2", color: "#0070f2", background: "#ebf5ff" } : {}}
        >
          All ({ALL_QUESTIONS.length})
        </button>
        {SECTIONS.map((s) => (
          <button
            key={s.name}
            className={`ip-filter-chip ${filterSection === s.name ? "active" : ""}`}
            onClick={() => handleSectionChange(s.name)}
            style={
              filterSection === s.name
                ? {
                    borderColor: sectionColor[s.name],
                    color: sectionColor[s.name],
                    background: sectionColor[s.name] + "18",
                  }
                : {}
            }
          >
            {s.name} ({s.count})
          </button>
        ))}
      </div>

      {/* ── Main Card ── */}
      <div className="ip-card-wrapper">
        {/* Progress bar */}
        <div className="ip-progress-bar-track">
          <div
            className="ip-progress-bar-fill"
            style={{ width: `${progress}%`, background: currentColor }}
          />
        </div>

        <div className="ip-card">
          {/* Card header */}
          <div className="ip-card-meta">
            <span
              className="ip-section-tag"
              style={{ background: currentColor + "18", color: currentColor }}
            >
              {question.section}
            </span>
            <span className="ip-q-counter">
              {currentIndex + 1} / {total}
            </span>
          </div>

          {/* Question */}
          <div className="ip-question-block">
            <div
              className="ip-q-number"
              style={{ color: currentColor }}
            >
              Q{question.id}
            </div>
            <h2 className="ip-question-text">{question.question}</h2>
          </div>

          {/* Reveal toggle */}
          {!revealAnswer ? (
            <button
              className="ip-reveal-btn"
              style={{ background: currentColor }}
              onClick={() => setRevealAnswer(true)}
            >
              Reveal Answer
            </button>
          ) : (
            <div className="ip-answer-block">
              <div className="ip-answer-section">
                <div className="ip-answer-label">Answer</div>
                <p className="ip-answer-text">{question.answer}</p>
              </div>

              <div className="ip-example-section">
                <div className="ip-example-label">
                  <span className="ip-example-icon">💡</span>
                  Practical Example
                </div>
                <p className="ip-example-text">{question.practicalExample}</p>
              </div>

              <button
                className="ip-hide-btn"
                onClick={() => setRevealAnswer(false)}
              >
                Hide Answer
              </button>
            </div>
          )}
        </div>

        {/* ── Navigation ── */}
        <div className="ip-nav">
          <button
            className="ip-nav-btn"
            onClick={() => goTo(0)}
            disabled={currentIndex === 0}
            title="First question"
          >
            ««
          </button>
          <button
            className="ip-nav-btn"
            onClick={() => goTo(currentIndex - 1)}
            disabled={currentIndex === 0}
            title="Previous"
          >
            ‹ Prev
          </button>

          {/* Jump to */}
          <form className="ip-jump-form" onSubmit={handleJump}>
            <input
              type="number"
              className="ip-jump-input"
              placeholder={`1–${total}`}
              value={jumpInput}
              min={1}
              max={total}
              onChange={(e) => setJumpInput(e.target.value)}
            />
            <button type="submit" className="ip-jump-btn" style={{ background: currentColor }}>
              Go
            </button>
          </form>

          <button
            className="ip-nav-btn"
            onClick={() => goTo(currentIndex + 1)}
            disabled={currentIndex === total - 1}
            title="Next"
          >
            Next ›
          </button>
          <button
            className="ip-nav-btn"
            onClick={() => goTo(total - 1)}
            disabled={currentIndex === total - 1}
            title="Last question"
          >
            »»
          </button>
        </div>

        {/* Dot pagination (visible for ≤ 20 questions) */}
        {total <= 20 && (
          <div className="ip-dots">
            {filteredQuestions.map((_, i) => (
              <button
                key={i}
                className={`ip-dot ${i === currentIndex ? "active" : ""}`}
                style={i === currentIndex ? { background: currentColor } : {}}
                onClick={() => goTo(i)}
                aria-label={`Question ${i + 1}`}
              />
            ))}
          </div>
        )}

        {/* Section overview shortcut */}
        <div className="ip-section-overview">
          <span className="ip-overview-label">Sections:</span>
          {SECTIONS.map((s) => {
            const sStart = ALL_QUESTIONS.findIndex((q) => q.section === s.name);
            const isCurrentSection = question.section === s.name;
            return (
              <button
                key={s.name}
                className={`ip-section-jump-btn ${isCurrentSection ? "active" : ""}`}
                style={
                  isCurrentSection
                    ? { borderColor: sectionColor[s.name], color: sectionColor[s.name] }
                    : {}
                }
                onClick={() => {
                  setFilterSection("all");
                  setCurrentIndex(sStart);
                  setRevealAnswer(false);
                }}
                title={s.name}
              >
                Q{s.range}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default InterviewPrep;
