import React, { useEffect, useState } from "react";
import "./InterviewPreparation.css";

type PrepPage = {
  topic: string;
  question: string;
  answer: string;
  keyPoints: string[];
};

const interviewPages: PrepPage[] = [
  {
    topic: "ABAP Basics",
    question: "What is SAP ABAP?",
    answer:
      "ABAP stands for Advanced Business Application Programming. It is SAP's programming language for building business applications, reports, forms, interfaces, and enhancements inside the SAP ecosystem.",
    keyPoints: ["Business application language", "Used across SAP ERP and S/4HANA", "Strongly tied to SAP data and processes"],
  },
  {
    kind: "qa",
    topic: "DDIC",
    question: "What is the ABAP Data Dictionary?",
    answer:
      "The ABAP Data Dictionary, often called DDIC, is the central repository for technical and semantic definitions such as tables, domains, data elements, views, search helps, and lock objects.",
    keyPoints: ["Central metadata store", "Shared by many programs", "Defines structure and meaning of data"],
  },
  {
    kind: "qa",
    topic: "Tables",
    question: "What is a transparent table?",
    answer:
      "A transparent table has a one-to-one relationship between the dictionary definition and the database table. The table exists physically in the database with the same structure as defined in SAP.",
    keyPoints: ["One definition, one physical table", "Used for application and master data", "Supports direct SQL access"],
  },
  {
    kind: "qa",
    topic: "Tables",
    question: "What are pooled and cluster tables?",
    answer:
      "Pooled and cluster tables are logical table types used in classic SAP systems to store multiple dictionary tables together at the database level. They are legacy concepts and are less relevant in newer HANA-based landscapes.",
    keyPoints: ["Logical storage model", "Classic SAP concept", "Less common in modern systems"],
  },
  {
    kind: "qa",
    topic: "Internal Tables",
    question: "What is an internal table?",
    answer:
      "An internal table is an in-memory table used in ABAP programs to hold and process multiple rows of data temporarily. It is one of the most important structures for reporting and business logic.",
    keyPoints: ["Temporary in-memory data", "Used heavily in loops and reports", "Can behave like a table, list, or set"],
  },
  {
    kind: "qa",
    topic: "Internal Tables",
    question: "What are the main types of internal tables?",
    answer:
      "The main internal table types are standard, sorted, and hashed tables. Standard tables are general purpose, sorted tables keep entries ordered by key, and hashed tables are optimized for fast key-based access.",
    keyPoints: ["Standard", "Sorted", "Hashed"],
  },
  {
    kind: "qa",
    topic: "Internal Tables",
    question: "What is a work area?",
    answer:
      "A work area is a single-row container used to read, modify, or process one line of an internal table at a time. It acts like a staging area for row-level logic.",
    keyPoints: ["Single row container", "Used with LOOP and READ TABLE", "Often paired with internal tables"],
  },
  {
    kind: "qa",
    topic: "ABAP Syntax",
    question: "What is a field symbol?",
    answer:
      "A field symbol is like a pointer or alias to an ABAP data object. It lets you work with data dynamically without copying it unnecessarily, which is useful for performance and flexible logic.",
    keyPoints: ["Dynamic reference", "Avoids unnecessary copying", "Common in high-performance table processing"],
  },
  {
    kind: "qa",
    topic: "DDIC",
    question: "What is the difference between a domain and a data element?",
    answer:
      "A domain defines the technical characteristics of a field such as data type, length, and allowed values. A data element describes the business meaning and text labels for that field.",
    keyPoints: ["Domain = technical definition", "Data element = semantic definition", "Often used together"],
  },
  {
    kind: "qa",
    topic: "DDIC",
    question: "What is a search help?",
    answer:
      "A search help provides value assistance to users so they can pick valid values from a list instead of typing them manually. It improves usability and reduces data entry errors.",
    keyPoints: ["Value help", "User-friendly input support", "Can be attached to fields and domains"],
  },
  {
    kind: "qa",
    topic: "DDIC",
    question: "What is a lock object?",
    answer:
      "A lock object is used to prevent inconsistent changes when multiple users try to update the same business object at the same time. SAP generates enqueue and dequeue function modules from it.",
    keyPoints: ["Concurrency control", "Prevents conflicting updates", "ENQUEUE and DEQUEUE function modules"],
  },
  {
    kind: "qa",
    topic: "Performance",
    question: "What is table buffering?",
    answer:
      "Table buffering stores table data in application server memory so reads can be served faster without hitting the database every time. It is best suited for small, stable, frequently read tables.",
    keyPoints: ["Speeds up reads", "Best for stable reference tables", "Not suitable for frequently changing data"],
  },
  {
    kind: "qa",
    topic: "Performance",
    question: "When should a table be buffered?",
    answer:
      "A table should be buffered when it is read often, changes rarely, and the size is manageable. Buffering is not a good fit for volatile transactional tables or large datasets with frequent updates.",
    keyPoints: ["Frequent reads", "Rare updates", "Small to medium reference data"],
  },
  {
    kind: "qa",
    topic: "Database Access",
    question: "What is Open SQL?",
    answer:
      "Open SQL is SAP's database-independent SQL layer used in ABAP programs. It works across supported database platforms and is the preferred way to read and manipulate database data in application code.",
    keyPoints: ["Database-independent", "Preferred in ABAP", "Portable across systems"],
  },
  {
    kind: "qa",
    topic: "Database Access",
    question: "What is Native SQL?",
    answer:
      "Native SQL is database-specific SQL written directly for the underlying database. It offers low-level control but reduces portability and should only be used when Open SQL cannot solve the requirement.",
    keyPoints: ["Database-specific", "Lower portability", "Use only when necessary"],
  },
  {
    kind: "qa",
    topic: "Database Access",
    question: "What is the difference between SELECT SINGLE and SELECT ... UP TO 1 ROWS?",
    answer:
      "SELECT SINGLE is meant for fetching one row that matches a full key or unique condition. SELECT ... UP TO 1 ROWS can return one arbitrary matching row unless you define ordering, so it is less precise.",
    keyPoints: ["SELECT SINGLE for unique lookup", "UP TO 1 ROWS for first matching row", "Ordering matters for deterministic results"],
  },
  {
    kind: "qa",
    topic: "Database Access",
    question: "What is FOR ALL ENTRIES used for?",
    answer:
      "FOR ALL ENTRIES is used to fetch database rows based on the values held in an internal table. It is useful for batch lookups, but the driving table must be checked for emptiness before use.",
    keyPoints: ["Batch database lookup", "Driven by internal table", "Always check for empty input table"],
  },
  {
    kind: "qa",
    topic: "Database Access",
    question: "What is a database join?",
    answer:
      "A join combines rows from two or more tables based on matching columns. It is useful when you want related data in one result set instead of reading each table separately.",
    keyPoints: ["Combines related tables", "Reduces multiple round trips", "Common in reporting"],
  },
  {
    kind: "qa",
    topic: "Internal Tables",
    question: "What does READ TABLE ... BINARY SEARCH do?",
    answer:
      "Binary search finds a row quickly in a sorted standard table by repeatedly narrowing the search range. It is fast, but the table must be sorted by the key being searched.",
    keyPoints: ["Fast key lookup", "Requires sorted table", "Useful for large datasets"],
  },
  {
    kind: "qa",
    topic: "Internal Tables",
    question: "What is the difference between APPEND and INSERT?",
    answer:
      "APPEND adds a line to the end of a table, while INSERT places a line at a specific index or according to table key rules. INSERT is stricter and can fail if key constraints are violated.",
    keyPoints: ["APPEND = add to end", "INSERT = controlled placement", "Key handling matters"],
  },
  {
    kind: "qa",
    topic: "Internal Tables",
    question: "What does COLLECT do?",
    answer:
      "COLLECT inserts a line into an internal table and aggregates numeric fields for rows with the same key. It is useful for summarization scenarios such as totals and grouped values.",
    keyPoints: ["Inserts or aggregates", "Key-based summarization", "Good for totals"],
  },
  {
    kind: "qa",
    topic: "Runtime",
    question: "What is SY-SUBRC?",
    answer:
      "SY-SUBRC is the return code of the last ABAP statement. A value of 0 usually means success, while non-zero values indicate that the operation did not complete as expected.",
    keyPoints: ["Return code", "Check after many statements", "0 usually means success"],
  },
  {
    kind: "qa",
    topic: "Runtime",
    question: "What is SY-TABIX?",
    answer:
      "SY-TABIX contains the current row index of an internal table operation. It is often used when you need to know where a row was found or inserted.",
    keyPoints: ["Current table index", "Useful with READ TABLE and LOOP", "Helps with row position logic"],
  },
  {
    kind: "qa",
    topic: "Modularization",
    question: "What is modularization in ABAP?",
    answer:
      "Modularization means splitting a program into smaller reusable units so the code is easier to maintain, test, and understand. ABAP uses subroutines, function modules, includes, methods, and classes for this purpose.",
    keyPoints: ["Improves maintainability", "Promotes reuse", "Supports cleaner design"],
  },
  {
    kind: "qa",
    topic: "Modularization",
    question: "What is a subroutine?",
    answer:
      "A subroutine is a reusable block of code declared with FORM and called with PERFORM. It is useful for local program logic that does not need to be exposed as a global API.",
    keyPoints: ["FORM / PERFORM", "Local reuse", "Simple procedural reuse"],
  },
  {
    kind: "qa",
    topic: "Modularization",
    question: "What is a function module?",
    answer:
      "A function module is a reusable routine created in the Function Builder and grouped inside a function group. It supports formal parameters, exceptions, and global sharing within its group.",
    keyPoints: ["Reusable API-like routine", "Has parameters and exceptions", "Stored in a function group"],
  },
  {
    kind: "qa",
    topic: "Modularization",
    question: "What is a function group?",
    answer:
      "A function group is a container that holds related function modules together. It can also contain global data and includes that are shared by all modules in that group.",
    keyPoints: ["Container for function modules", "Shared global data", "Organizes related logic"],
  },
  {
    kind: "qa",
    topic: "Modularization",
    question: "What is an include program?",
    answer:
      "An include program is a reusable source-code fragment inserted into another ABAP program at compile time. It helps split large programs into smaller files without changing runtime behavior.",
    keyPoints: ["Compile-time inclusion", "Source organization", "Common in large programs"],
  },
  {
    kind: "qa",
    topic: "Modularization",
    question: "What is a macro?",
    answer:
      "A macro is a textual code expansion mechanism that lets you define repeated logic once and expand it where needed. It is powerful but should be used carefully because it can make debugging harder.",
    keyPoints: ["Text expansion", "Useful for repeated patterns", "Harder to debug than methods"],
  },
  {
    kind: "qa",
    topic: "BDC",
    question: "What is BDC in ABAP?",
    answer:
      "BDC stands for Batch Data Communication. It is used to upload legacy data into SAP by simulating screen-by-screen user input through batch input techniques.",
    keyPoints: ["Legacy data migration", "Screen simulation", "Batch input approach"],
  },
  {
    kind: "qa",
    topic: "BDC",
    question: "What is the difference between session method and call transaction method?",
    answer:
      "The session method stores data in a batch input session and processes it later, while call transaction processes the transaction directly from the program. Session method is asynchronous; call transaction is immediate.",
    keyPoints: ["Session = later processing", "Call transaction = immediate", "Different control and error handling"],
  },
  {
    kind: "qa",
    topic: "Forms",
    question: "What is SAPscript?",
    answer:
      "SAPscript is SAP's classic form and print layout tool used for creating invoices, letters, and other formatted outputs. It is older than SmartForms and less flexible in modern development.",
    keyPoints: ["Classic form technology", "Used for print layouts", "Older SAP form tool"],
  },
  {
    kind: "qa",
    topic: "Forms",
    question: "What are SmartForms?",
    answer:
      "SmartForms are SAP's successor to SAPscript for designing forms more efficiently. They provide a more visual design experience and simpler maintenance for print output.",
    keyPoints: ["Successor to SAPscript", "Visual design", "Simpler maintenance"],
  },
  {
    kind: "qa",
    topic: "Output",
    question: "What is ALV?",
    answer:
      "ALV stands for ABAP List Viewer. It is a standard SAP framework for displaying tabular data with sorting, filtering, totals, and export options.",
    keyPoints: ["Standard list display", "Supports sorting and filtering", "Widely used in reports"],
  },
  {
    kind: "qa",
    topic: "Integration",
    question: "What is a BAPI?",
    answer:
      "A BAPI is a Business Application Programming Interface. It is a standardized way to access SAP business objects and operations from external systems or other SAP programs.",
    keyPoints: ["Standard integration API", "Business-object based", "Used for external access"],
  },
  {
    kind: "qa",
    topic: "Integration",
    question: "What is RFC?",
    answer:
      "RFC stands for Remote Function Call. It allows ABAP systems or external applications to call function modules across system boundaries.",
    keyPoints: ["Remote function call", "Cross-system communication", "Supports integration"],
  },
  {
    kind: "qa",
    topic: "Integration",
    question: "What is the difference between synchronous and asynchronous RFC?",
    answer:
      "Synchronous RFC waits for the remote system to complete the call before continuing, while asynchronous RFC sends the request and continues without waiting for the response.",
    keyPoints: ["Synchronous waits", "Asynchronous continues", "Different timing and control"],
  },
  {
    kind: "qa",
    topic: "Integration",
    question: "What are ALE and IDoc?",
    answer:
      "ALE is SAP's Application Link Enabling framework for distributing data between systems, and IDoc is the intermediate document format used to transfer structured business data.",
    keyPoints: ["ALE = distribution framework", "IDoc = data format", "Used in SAP integration"],
  },
  {
    kind: "qa",
    topic: "Enhancements",
    question: "What is a user exit?",
    answer:
      "A user exit is a predefined enhancement point in standard SAP code where custom logic can be added without changing the original program directly.",
    keyPoints: ["Custom logic hook", "Avoids modifying SAP standard", "Classic enhancement method"],
  },
  {
    kind: "qa",
    topic: "Enhancements",
    question: "What is a customer exit?",
    answer:
      "A customer exit is an enhancement point provided by SAP and typically implemented through a project and function module. It is a structured way to add customer-specific behavior.",
    keyPoints: ["SAP-provided enhancement point", "Project-based implementation", "Customer-specific behavior"],
  },
  {
    kind: "qa",
    topic: "Enhancements",
    question: "What is a BAdI?",
    answer:
      "A BAdI, or Business Add-In, is an object-oriented enhancement technique in SAP. It lets you plug in custom implementations at defined enhancement spots.",
    keyPoints: ["Object-oriented enhancement", "Multiple implementations possible", "Modern enhancement approach"],
  },
  {
    kind: "qa",
    topic: "Enhancements",
    question: "What is an enhancement spot?",
    answer:
      "An enhancement spot is a place in the code or framework where SAP allows custom extensions. It is often used with BAdIs and explicit enhancement points.",
    keyPoints: ["Extension location", "Supports custom logic", "Works with modern enhancement framework"],
  },
  {
    kind: "qa",
    topic: "Screens",
    question: "What is CALL SCREEN used for?",
    answer:
      "CALL SCREEN opens a dynpro screen and branches temporarily to it during program execution. It is used when a report or dialog program needs a screen-based interaction flow.",
    keyPoints: ["Starts a screen flow", "Temporarily branches to dynpro", "Common in dialog programs"],
  },
  {
    kind: "qa",
    topic: "Screens",
    question: "What is PBO?",
    answer:
      "PBO stands for Process Before Output. It runs before a screen is displayed and is used to prepare screen fields, attributes, and layout.",
    keyPoints: ["Runs before output", "Prepares screen display", "Dynpro processing step"],
  },
  {
    kind: "qa",
    topic: "Screens",
    question: "What is PAI?",
    answer:
      "PAI stands for Process After Input. It runs after the user interacts with a screen and is used to validate input and respond to user commands.",
    keyPoints: ["Runs after input", "Validates data", "Handles user actions"],
  },
  {
    kind: "qa",
    topic: "Reports",
    question: "What is an interactive report?",
    answer:
      "An interactive report lets the user drill into list output and see secondary lists or detailed follow-up data. It is built around list events like AT LINE-SELECTION.",
    keyPoints: ["Drill-down style report", "Uses list events", "Useful for detail navigation"],
  },
  {
    kind: "qa",
    topic: "Reports",
    question: "What are logical databases?",
    answer:
      "Logical databases are SAP-defined data retrieval frameworks that provide structured hierarchical access to related data. They are used less often today but still matter in classic reporting interviews.",
    keyPoints: ["Structured data retrieval", "Hierarchical access", "Classic ABAP concept"],
  },
  {
    kind: "qa",
    topic: "Reports",
    question: "What is AT LINE-SELECTION?",
    answer:
      "AT LINE-SELECTION is an event used in interactive reports when the user selects a line from the list. It is typically used to show detail information for the selected row.",
    keyPoints: ["Interactive list event", "Triggered by line selection", "Shows secondary details"],
  },
  {
    kind: "qa",
    topic: "Reports",
    question: "What is TOP-OF-PAGE used for?",
    answer:
      "TOP-OF-PAGE is used to write headers for lists and secondary lists during reporting. It helps keep report output readable and structured.",
    keyPoints: ["List header event", "Improves readability", "Used in classic reporting"],
  },
  {
    kind: "qa",
    topic: "Reports",
    question: "What is AT USER-COMMAND?",
    answer:
      "AT USER-COMMAND handles custom function codes selected by the user on a list or screen. It is commonly used for buttons, menu actions, and interactive report commands.",
    keyPoints: ["Handles custom commands", "Used with GUI actions", "Common in list processing"],
  },
  {
    kind: "qa",
    topic: "Transactions",
    question: "What is SUBMIT used for?",
    answer:
      "SUBMIT starts another report program from the current program and can pass selection-screen values to it. It is useful when one report needs to trigger another report flow.",
    keyPoints: ["Calls another report", "Can pass selection values", "Report-to-report execution"],
  },
  {
    kind: "qa",
    topic: "Transactions",
    question: "What is LEAVE TO TRANSACTION used for?",
    answer:
      "LEAVE TO TRANSACTION ends the current program flow and starts a transaction directly. It is often used for navigation or handoff to a standard SAP transaction.",
    keyPoints: ["Direct transaction navigation", "Ends current flow", "Common in menu navigation"],
  },
  {
    kind: "qa",
    topic: "Transactions",
    question: "What is SET/GET parameter ID?",
    answer:
      "SET/GET parameter IDs are used to store and reuse small values in SAP memory between screens or transactions. They help pass default values and remember user context.",
    keyPoints: ["SAP memory values", "Useful for defaults", "Passes context across screens"],
  },
  {
    kind: "qa",
    topic: "Memory",
    question: "What is the difference between SAP memory and ABAP memory?",
    answer:
      "SAP memory is shared across sessions in the same SAP GUI logon, while ABAP memory is local to an internal session and is usually used to pass data between programs in the same call sequence.",
    keyPoints: ["SAP memory = broader scope", "ABAP memory = internal session", "Different lifetimes"],
  },
  {
    kind: "qa",
    topic: "Database",
    question: "What is COMMIT WORK?",
    answer:
      "COMMIT WORK saves the current logical unit of work and makes database changes permanent. It also triggers update tasks that were queued for execution.",
    keyPoints: ["Finalizes changes", "Commits LUW", "Triggers update tasks"],
  },
  {
    kind: "qa",
    topic: "Database",
    question: "What is ROLLBACK WORK?",
    answer:
      "ROLLBACK WORK cancels the current logical unit of work and undoes pending database changes that have not been committed yet.",
    keyPoints: ["Cancels pending changes", "Used for error handling", "Undo before commit"],
  },
  {
    kind: "qa",
    topic: "Database",
    question: "What is an update task?",
    answer:
      "An update task performs database updates asynchronously or synchronously in SAP's update framework. It is used to keep business changes consistent and reliable.",
    keyPoints: ["Handles database updates", "Part of LUW processing", "Ensures consistency"],
  },
  {
    kind: "qa",
    topic: "Database",
    question: "What is an enqueue/dequeue process?",
    answer:
      "Enqueue creates a lock on business data so other users cannot change it at the same time, and dequeue releases that lock when processing is complete.",
    keyPoints: ["Application-level locking", "Prevents concurrency issues", "Lock and release pair"],
  },
  {
    kind: "qa",
    topic: "Syntax",
    question: "What is the difference between CLEAR, REFRESH, and FREE?",
    answer:
      "CLEAR resets a variable or internal table header, REFRESH empties the contents of an internal table, and FREE also releases the allocated memory used by the table.",
    keyPoints: ["CLEAR = reset value", "REFRESH = empty table", "FREE = release memory"],
  },
  {
    kind: "qa",
    topic: "Procedural ABAP",
    question: "What is pass by value and pass by reference?",
    answer:
      "Pass by value sends a copy of the variable to the called routine, while pass by reference passes the actual memory location so changes affect the original value.",
    keyPoints: ["Copy vs shared reference", "Affects whether original changes", "Important in subroutines and methods"],
  },
  {
    kind: "qa",
    topic: "Procedural ABAP",
    question: "What are EXPORTING, IMPORTING, CHANGING, and TABLES parameters?",
    answer:
      "These parameter types define how data moves between caller and callee. EXPORTING sends data out, IMPORTING receives data, CHANGING allows both directions, and TABLES is the classic internal-table parameter style.",
    keyPoints: ["Direction of data flow", "Used in function modules and methods", "TABLES is older style"],
  },
  {
    kind: "qa",
    topic: "Procedural ABAP",
    question: "What is MOVE-CORRESPONDING?",
    answer:
      "MOVE-CORRESPONDING copies values between structures or internal tables based on matching field names rather than position. It reduces manual field-by-field assignments.",
    keyPoints: ["Name-based mapping", "Simplifies structure transfers", "Used for like-structured data"],
  },
  {
    kind: "qa",
    topic: "Control Flow",
    question: "What is CASE used for?",
    answer:
      "CASE is used for branching logic when one variable must be compared against several possible values. It keeps conditional code cleaner than a long chain of IF statements.",
    keyPoints: ["Multi-branch logic", "Cleaner than nested IFs", "Good for fixed value checks"],
  },
  {
    kind: "qa",
    topic: "Control Flow",
    question: "What is the difference between DO and WHILE?",
    answer:
      "DO repeats a block a fixed number of times or until you exit manually, while WHILE continues only as long as its condition remains true.",
    keyPoints: ["DO = fixed or manual loop", "WHILE = condition-driven", "Common in iterative logic"],
  },
  {
    kind: "qa",
    topic: "Selection Screen",
    question: "What is SELECT-OPTIONS?",
    answer:
      "SELECT-OPTIONS creates a range table on the selection screen so the user can enter single values, intervals, and exclusion patterns. It is useful for flexible report filtering.",
    keyPoints: ["Range-based input", "Supports intervals and exclusions", "Often used in reports"],
  },
  {
    kind: "qa",
    topic: "Selection Screen",
    question: "What is PARAMETERS?",
    answer:
      "PARAMETERS creates a single input field on the selection screen. It is used when the report expects one value rather than a range.",
    keyPoints: ["Single input field", "Simple report filtering", "Common for simple selections"],
  },
  {
    kind: "qa",
    topic: "Performance",
    question: "What is the best way to improve ABAP performance?",
    answer:
      "Performance tuning usually means reducing database round trips, selecting only the fields you need, using the right internal table type, avoiding nested selects, and processing data in packages where appropriate.",
    keyPoints: ["Reduce DB trips", "Avoid unnecessary data", "Choose the right table type"],
  },
  {
    kind: "qa",
    topic: "OO ABAP",
    question: "What is object-oriented ABAP?",
    answer:
      "Object-oriented ABAP uses classes, objects, methods, inheritance, and interfaces to structure code in a more modular and reusable way. It is the preferred approach for modern ABAP development.",
    keyPoints: ["Classes and objects", "Methods and interfaces", "Modern development style"],
  },
];

interface InterviewPreparationProps {
  onBackToTests: () => void;
}

const InterviewPreparation: React.FC<InterviewPreparationProps> = ({ onBackToTests }) => {
  const [currentPageIndex, setCurrentPageIndex] = useState(0);

  const currentPage = interviewPages[currentPageIndex];
  const pageNumberLabel = String(currentPageIndex + 1).padStart(2, "0");

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [currentPageIndex]);

  const goPrevious = () => setCurrentPageIndex((prev) => Math.max(0, prev - 1));
  const goNext = () => setCurrentPageIndex((prev) => Math.min(interviewPages.length - 1, prev + 1));

  return (
    <div className="interview-prep-shell">
      <section className="prep-topbar card-surface">
        <div className="prep-topbar-copy">
          <span className="prep-kicker">Interview preparation</span>
          <h2>SAP ABAP questions</h2>
        </div>

        <div className="prep-topbar-meta">
          <div className="prep-pill">
            <span className="prep-pill-label">Page</span>
            <strong>
              {pageNumberLabel}/{String(interviewPages.length).padStart(2, "0")}
            </strong>
          </div>
          <button type="button" className="secondary-btn prep-back-btn" onClick={onBackToTests}>
            Back to Tests
          </button>
        </div>
      </section>

      <div className="prep-reader-wrap">
        <button
          type="button"
          className="prep-arrow prep-arrow-left"
          onClick={goPrevious}
          disabled={currentPageIndex === 0}
          aria-label="Previous page"
        >
          <span aria-hidden="true">‹</span>
        </button>

        <main className="interview-prep-reader card-surface">
          <div className="reader-topbar">
            <div>
              <p className="reader-eyebrow">{currentPage.topic}</p>
              <h3>Question {pageNumberLabel}</h3>
            </div>

            <div className="reader-progress">
              <span>
                {currentPageIndex + 1} of {interviewPages.length}
              </span>
              <div className="progress-track" aria-hidden="true">
                <div
                  className="progress-fill"
                  style={{ width: `${((currentPageIndex + 1) / interviewPages.length) * 100}%` }}
                />
              </div>
            </div>
          </div>

          <article className="qa-page">
            <div className="qa-question">
              <span className="qa-label">Question</span>
              <h4>{currentPage.question}</h4>
            </div>

            <div className="qa-answer">
              <span className="qa-label">Answer</span>
              <p>{currentPage.answer}</p>
            </div>

            <div className="qa-keypoints">
              {currentPage.keyPoints.map((point) => (
                <span key={point} className="keypoint-chip">
                  {point}
                </span>
              ))}
            </div>
          </article>

          <div className="reader-footer">
            <div className="reader-dots" aria-hidden="true">
              {interviewPages.map((_, index) => (
                <button
                  key={index}
                  type="button"
                  className={`reader-dot ${index === currentPageIndex ? "active" : ""}`}
                  onClick={() => setCurrentPageIndex(index)}
                  aria-label={`Go to page ${index + 1}`}
                />
              ))}
            </div>
          </div>
        </main>

        <button
          type="button"
          className="prep-arrow prep-arrow-right"
          onClick={goNext}
          disabled={currentPageIndex === interviewPages.length - 1}
          aria-label="Next page"
        >
          <span aria-hidden="true">›</span>
        </button>
      </div>
    </div>
  );
};

export default InterviewPreparation;
