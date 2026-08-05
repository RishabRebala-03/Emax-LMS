import io
import json
import csv
import re
from typing import List, Dict, Any, Tuple

try:
    import docx
except ImportError:
    docx = None

try:
    import pypdf
except ImportError:
    pypdf = None


def parse_questions_file(file_bytes: bytes, filename: str) -> Tuple[List[Dict[str, Any]], List[str]]:
    """
    Parses an uploaded test file (.json, .csv, .txt, .docx, .pdf) and returns:
    (questions, sections)
    """
    fname_lower = filename.lower()
    
    if fname_lower.endswith(".json"):
        return _parse_json(file_bytes)
    elif fname_lower.endswith(".csv"):
        return _parse_csv(file_bytes)
    elif fname_lower.endswith(".docx") or fname_lower.endswith(".doc"):
        return _parse_docx(file_bytes)
    elif fname_lower.endswith(".pdf"):
        return _parse_pdf(file_bytes)
    else:
        return _parse_txt(file_bytes.decode("utf-8", errors="replace"))


def _parse_json(file_bytes: bytes) -> Tuple[List[Dict[str, Any]], List[str]]:
    text = file_bytes.decode("utf-8", errors="replace")
    data = json.loads(text)
    
    items = []
    if isinstance(data, list):
        items = data
    elif isinstance(data, dict):
        items = data.get("questions") or data.get("items") or data.get("data") or data.get("questionList") or []
    
    questions = []
    sections_set = set()
    
    for idx, item in enumerate(items, 1):
        q_text = str(
            item.get("question") or item.get("questionText") or item.get("title") or 
            item.get("prompt") or item.get("stem") or item.get("q") or ""
        ).strip()
        if not q_text:
            continue
        
        q_text = re.sub(r'^(?:q(?:uestion)?\s*[\#\.\-]?\s*\d+[\.\)\:\-]?|\d+[\.\)\:\-]|\(\d+\)|\[\d+\])\s*', '', q_text, flags=re.IGNORECASE).strip() or q_text
        
        raw_options = item.get("options") or item.get("choices") or item.get("opt") or []
        if isinstance(raw_options, str):
            options_list = [o.strip() for o in re.split(r'[|;\n]', raw_options) if o.strip()]
        else:
            options_list = [str(o).strip() for o in raw_options if str(o).strip()]
            
        unique_options = []
        seen = set()
        for o in options_list:
            if o not in seen:
                seen.add(o)
                unique_options.append(o)
        options = unique_options
            
        raw_ans = (
            item.get("correctAnswer") or item.get("correct_answer") or item.get("answer") or 
            item.get("correct") or item.get("correctAnswers") or item.get("ans") or item.get("key") or ""
        )
        mapped_ans = _map_correct_answer(raw_ans, options)
        
        q_type = item.get("type")
        if not q_type:
            if isinstance(mapped_ans, list) and len(mapped_ans) > 1:
                q_type = "multiple"
            elif len(options) >= 2:
                q_type = "mcq"
            else:
                q_type = "text"
        
        section = str(item.get("section") or item.get("category") or "General").strip() or "General"
        sections_set.add(section)
        
        raw_marks = item.get("marks") or item.get("points") or item.get("score") or 1
        try:
            marks = int(float(str(raw_marks).strip()))
        except (ValueError, TypeError):
            marks = 1
        
        questions.append({
            "id": f"q-{idx}",
            "type": q_type,
            "question": q_text,
            "options": options,
            "correctAnswer": mapped_ans,
            "section": section,
            "marks": marks
        })
        
    return questions, list(sections_set) if sections_set else ["General"]


def _parse_csv(file_bytes: bytes) -> Tuple[List[Dict[str, Any]], List[str]]:
    text = file_bytes.decode("utf-8", errors="replace")
    reader = csv.reader(io.StringIO(text))
    rows = [r for r in reader if any(cell.strip() for cell in r)]
    
    if not rows:
        return [], ["General"]
    
    header = [c.strip().lower() for c in rows[0]]
    has_header = any(h in [
        "question", "q", "title", "prompt", "stem", "options", "answer", "correct answer", 
        "correctanswer", "ans", "option a", "option 1", "opt a", "choice a"
    ] for h in header)
    
    questions = []
    sections_set = set()
    data_rows = rows[1:] if has_header else rows
    
    for idx, row in enumerate(data_rows, 1):
        if not row:
            continue
        
        q_text = ""
        options_list = []
        raw_ans = ""
        section = "General"
        marks = 1
        q_type = None
        
        if has_header:
            row_dict = {header[i]: row[i].strip() for i in range(min(len(header), len(row)))}
            q_text = (
                row_dict.get("question") or row_dict.get("q") or row_dict.get("title") or 
                row_dict.get("prompt") or row_dict.get("stem") or ""
            )
            section = row_dict.get("section") or row_dict.get("category") or "General"
            raw_ans = (
                row_dict.get("correct answer") or row_dict.get("correctanswer") or 
                row_dict.get("answer") or row_dict.get("ans") or row_dict.get("key") or 
                row_dict.get("correct") or ""
            )
            
            marks_str = row_dict.get("marks") or row_dict.get("points") or row_dict.get("score") or "1"
            try:
                marks = int(float(marks_str))
            except (ValueError, TypeError):
                marks = 1
            q_type = row_dict.get("type")
            
            if "options" in row_dict and row_dict["options"]:
                options_list = [o.strip() for o in re.split(r'[|;\n]', row_dict["options"]) if o.strip()]
            else:
                for k in header:
                    if (
                        k.startswith("option") or k.startswith("opt") or k.startswith("choice") or 
                        k in ["a", "b", "c", "d", "e", "f", "1", "2", "3", "4"]
                    ) and k not in ["options", "option", "choice", "choices"]:
                        if row_dict.get(k):
                            options_list.append(row_dict[k])
        else:
            q_text = row[0].strip()
            if len(row) > 1:
                raw_ans = row[-1].strip() if len(row) > 2 else ""
                options_list = [c.strip() for c in row[1:-1] if c.strip()]
        
        if not q_text:
            continue
        
        unique_options = []
        seen = set()
        for o in options_list:
            if o not in seen:
                seen.add(o)
                unique_options.append(o)
        options = unique_options
        
        q_text = re.sub(r'^(?:q(?:uestion)?\s*[\#\.\-]?\s*\d+[\.\)\:\-]?|\d+[\.\)\:\-]|\(\d+\)|\[\d+\])\s*', '', q_text, flags=re.IGNORECASE).strip() or q_text
        sections_set.add(section)
        
        mapped_ans = _map_correct_answer(raw_ans, options)
        
        if not q_type:
            if isinstance(mapped_ans, list) and len(mapped_ans) > 1:
                q_type = "multiple"
            elif len(options) >= 2:
                q_type = "mcq"
            else:
                q_type = "text"
                
        questions.append({
            "id": f"q-{idx}",
            "type": q_type,
            "question": q_text,
            "options": options,
            "correctAnswer": mapped_ans,
            "section": section,
            "marks": marks
        })
        
    return questions, list(sections_set) if sections_set else ["General"]


def _parse_docx(file_bytes: bytes) -> Tuple[List[Dict[str, Any]], List[str]]:
    if not docx:
        return _parse_txt(file_bytes.decode("utf-8", errors="ignore"))
    
    doc = docx.Document(io.BytesIO(file_bytes))
    
    # 1. Check if DOCX contains structured tables for questions
    table_questions = []
    table_sections = set()
    
    for table in doc.tables:
        if not table.rows:
            continue
        
        headers = [cell.text.strip().lower() for cell in table.rows[0].cells]
        has_q_header = any(h in ["question", "q", "title", "prompt", "stem", "question text"] for h in headers)
        
        if has_q_header and len(table.rows) > 1:
            q_col = -1
            ans_col = -1
            opt_cols = []
            sec_col = -1
            marks_col = -1
            
            for c_idx, h in enumerate(headers):
                if h in ["question", "q", "title", "prompt", "stem", "question text"]:
                    q_col = c_idx
                elif h in ["answer", "correct answer", "correctanswer", "ans", "key", "correct"]:
                    ans_col = c_idx
                elif h in ["section", "category"]:
                    sec_col = c_idx
                elif h in ["marks", "points", "score"]:
                    marks_col = c_idx
                elif h.startswith("option") or h.startswith("opt") or h.startswith("choice") or h in ["a", "b", "c", "d", "e"]:
                    opt_cols.append(c_idx)
                    
            for row in table.rows[1:]:
                cells = [cell.text.strip() for cell in row.cells]
                if not any(cells):
                    continue
                
                q_text = cells[q_col] if q_col != -1 and q_col < len(cells) else ""
                if not q_text:
                    continue
                
                q_text = re.sub(r'^(?:q(?:uestion)?\s*[\#\.\-]?\s*\d+[\.\)\:\-]?|\d+[\.\)\:\-]|\(\d+\)|\[\d+\])\s*', '', q_text, flags=re.IGNORECASE).strip() or q_text
                
                options_list = []
                for o_idx in opt_cols:
                    if o_idx < len(cells) and cells[o_idx]:
                        options_list.append(cells[o_idx])
                        
                raw_ans = cells[ans_col] if ans_col != -1 and ans_col < len(cells) else ""
                sec_val = cells[sec_col] if sec_col != -1 and sec_col < len(cells) and cells[sec_col] else "General"
                
                marks = 1
                if marks_col != -1 and marks_col < len(cells) and cells[marks_col]:
                    try:
                        marks = int(float(cells[marks_col]))
                    except (ValueError, TypeError):
                        marks = 1
                        
                mapped_ans = _map_correct_answer(raw_ans, options_list)
                q_type = "multiple" if isinstance(mapped_ans, list) and len(mapped_ans) > 1 else ("mcq" if len(options_list) >= 2 else "text")
                
                table_sections.add(sec_val)
                table_questions.append({
                    "id": f"q-{len(table_questions) + 1}",
                    "type": q_type,
                    "question": q_text,
                    "options": options_list,
                    "correctAnswer": mapped_ans,
                    "section": sec_val,
                    "marks": marks
                })
                
    if table_questions:
        return table_questions, list(table_sections)
    
    # 2. Fall back to paragraph text parsing
    full_text = []
    for p in doc.paragraphs:
        if p.text.strip():
            full_text.append(p.text.strip())
            
    for table in doc.tables:
        for row in table.rows:
            row_text = " ".join(cell.text.strip() for cell in row.cells if cell.text.strip())
            if row_text:
                full_text.append(row_text)
                
    return _parse_txt("\n".join(full_text))


def _parse_pdf(file_bytes: bytes) -> Tuple[List[Dict[str, Any]], List[str]]:
    if not pypdf:
        return _parse_txt(file_bytes.decode("utf-8", errors="ignore"))
    
    reader = pypdf.PdfReader(io.BytesIO(file_bytes))
    full_text = []
    
    for page in reader.pages:
        txt = page.extract_text()
        if txt:
            # Filter out running header/footer page numbers
            cleaned_lines = []
            for l in txt.splitlines():
                l_str = l.strip()
                if re.match(r'^(?:page\s+\d+(?:\s+of\s+\d+)?|\d+\s*/\s*\d+|---\s*page\s+\d+\s*---)$', l_str, re.IGNORECASE):
                    continue
                if l_str:
                    cleaned_lines.append(l_str)
            full_text.append("\n".join(cleaned_lines))
            
    return _parse_txt("\n".join(full_text))


def _parse_txt(text: str) -> Tuple[List[Dict[str, Any]], List[str]]:
    """
    Comprehensive text parser for test question documents (.txt, .docx, .pdf).
    Accurately identifies question headers, option blocks, answer keys, sections,
    and multi-line answers without dropping valid question content.
    """
    raw_lines = [line.strip() for line in text.splitlines() if line.strip()]
    if not raw_lines:
        return [], ["General"]

    # Header noise pattern (only for document header metadata block at top of file)
    top_header_noise_pattern = re.compile(
        r'^(?:'
        r'total\s*marks?|duration\b|time\s*(?:allowed|limit)?|'
        r'name\s*:|date\s*:|roll\s*no|college\s*:|max\s*marks|passing\s*marks|'
        r'general\s*instructions|all\s*questions\s*are\s*compulsory|'
        r'class\s*:|grade\s*:|semester\s*:'
        r')',
        re.IGNORECASE
    )

    # ABAP / Code construct protection pattern (CLASS...ENDCLASS, FORM...ENDFORM, etc.)
    code_keyword_pattern = re.compile(
        r'^\s*(?:class\b|endclass\b|interface\b|endinterface\b|form\b|endform\b|types\b|type\b|data\b|method\b|endmethod\b|public\b|private\b|protected\b)',
        re.IGNORECASE
    )

    # Standalone Answer Key block at bottom
    answer_key_map = {}
    lines = []
    in_answer_key = False

    ans_key_header_pattern = re.compile(r'^(?:answer\s*key|answers|answer\s*sheet|keys)\b', re.IGNORECASE)
    ans_key_item_pattern = re.compile(r'^(?:q(?:uestion)?\s*)?(\d+)[\.\:\-\s]+([a-zA-Z0-9,\s\&\-]+)', re.IGNORECASE)

    for line in raw_lines:
        if ans_key_header_pattern.match(line):
            in_answer_key = True
            continue
        if in_answer_key:
            m = ans_key_item_pattern.match(line)
            if m:
                q_num = int(m.group(1))
                ans_val = m.group(2).strip()
                answer_key_map[q_num] = ans_val
                continue
            inline_keys = re.findall(r'(\d+)[\s\:\-\.]*([a-zA-Z0-9]+)', line)
            if inline_keys:
                for qk, av in inline_keys:
                    try:
                        answer_key_map[int(qk)] = av
                    except ValueError:
                        pass
                continue
        lines.append(line)

    questions = []
    sections_set = set()
    current_section = "General"

    # Regex definitions
    section_pattern = re.compile(r'^(?:\[?\s*section\b[:\-\s]*|section\s+\d+[:\-\s]*)(.*)', re.IGNORECASE)
    
    q_start_pattern = re.compile(
        r'^(?:'
        r'(?:q(?:uestion)?\s*[\#\.\-]?\s*\d+[\.\)\:\-]?)|'  # Q1, Q1., Q1:, Q-1:, Question 1:
        r'(?:\d+[\.\)\:\-])|'                                # 1., 1), 1:, 1-
        r'(?:\(\d+\))|'                                      # (1)
        r'(?:\[\d+\])'                                       # [1]
        r')\s*(.+)',
        re.IGNORECASE
    )
    
    # Matches letter options (A., B), (a), [A], Option A:, Choice A -, A - ) or explicit option prefixes
    letter_opt_pattern = re.compile(
        r'^\s*\*?\s*(?:'
        r'\([a-zA-Z]\)|'                         # (A), (a)
        r'\[[a-zA-Z]\]|'                         # [A], [a]
        r'(?:option|choice)\s+[a-zA-Z1-9]\d?\s*[\-\.\)\:\–]?|' # Option A:, Choice 1 -
        r'[a-zA-Z]\s*[\-\.\)\:\–]'               # A., A), A:, A -, a.
        r')\s+',
        re.IGNORECASE
    )

    ans_line_pattern = re.compile(r'^\s*(?:ans(?:wer)?|correct(?:\s*answer|\s*choice|\s*option)?|key|right\s*answer)[:\-\s]*(.+)', re.IGNORECASE)
    explanation_pattern = re.compile(r'^\s*(?:explanation|solution|note|hint)[:\-\s]*(.+)?', re.IGNORECASE)
    marks_pattern = re.compile(r'\[?(\d+)\s*marks?\]?', re.IGNORECASE)

    curr_q_num = None
    curr_q_lines = []
    curr_options = []
    curr_correct_indices = []
    curr_ans_text = ""
    curr_marks = 1

    def finalize_current():
        nonlocal curr_q_num, curr_q_lines, curr_options, curr_correct_indices, curr_ans_text, curr_marks
        if not curr_q_lines:
            return

        q_full = "\n".join(curr_q_lines).strip()
        if not q_full:
            curr_q_num = None
            curr_q_lines = []
            curr_options = []
            curr_correct_indices = []
            curr_ans_text = ""
            curr_marks = 1
            return

        m_match = marks_pattern.search(q_full)
        if m_match:
            try:
                curr_marks = int(m_match.group(1))
                q_full = marks_pattern.sub("", q_full).strip()
            except ValueError:
                pass

        q_clean = re.sub(
            r'^(?:q(?:uestion)?\s*[\#\.\-]?\s*\d+[\.\)\:\-]?|\d+[\.\)\:\-]|\(\d+\)|\[\d+\])\s*',
            '',
            q_full,
            flags=re.IGNORECASE
        ).strip() or q_full

        raw_clean_opts = []
        correct_idxs = list(curr_correct_indices)

        for idx, opt_raw in enumerate(curr_options):
            opt_str = opt_raw.strip()
            is_correct = False

            if opt_str.startswith("*"):
                is_correct = True
                opt_str = opt_str.lstrip("*").strip()
            if opt_str.endswith("*"):
                is_correct = True
                opt_str = opt_str.rstrip("*").strip()

            tag_match = re.search(r'[\(\[]\s*(correct|ans|right|true)\s*[\)\]]', opt_str, re.IGNORECASE)
            if tag_match:
                is_correct = True
                opt_str = re.sub(r'[\(\[]\s*(correct|ans|right|true)\s*[\)\]]', '', opt_str, flags=re.IGNORECASE).strip()

            if is_correct and idx not in correct_idxs:
                correct_idxs.append(idx)

            # Strip option letter/number prefix (e.g. "A - FS00" -> "FS00", "A. Apple" -> "Apple")
            cleaned_opt_val = re.sub(
                r'^\s*\*?\s*(?:\([a-zA-Z1-9]\d?\)|\[[a-zA-Z1-9]\d?\]|(?:option|choice)\s+[a-zA-Z1-9]\d?\s*[\-\.\)\:\–]?|[a-zA-Z1-9]\d?\s*[\-\.\)\:\–])\s*',
                '',
                opt_str,
                flags=re.IGNORECASE
            ).strip() or opt_str

            raw_clean_opts.append(cleaned_opt_val)

        clean_opts = []
        seen = set()
        index_remap = {}
        for original_idx, opt_val in enumerate(raw_clean_opts):
            if not opt_val:
                continue
            if opt_val not in seen:
                seen.add(opt_val)
                index_remap[original_idx] = len(clean_opts)
                clean_opts.append(opt_val)
            else:
                existing_idx = clean_opts.index(opt_val)
                index_remap[original_idx] = existing_idx

        remapped_correct_idxs = sorted(list(set(index_remap[i] for i in correct_idxs if i in index_remap)))

        q_index = len(questions) + 1
        ans_from_key = answer_key_map.get(curr_q_num or q_index)

        mapped_ans = ""
        if curr_ans_text:
            mapped_ans = _map_correct_answer(curr_ans_text, clean_opts)
        elif ans_from_key:
            mapped_ans = _map_correct_answer(ans_from_key, clean_opts)
        elif remapped_correct_idxs:
            if len(remapped_correct_idxs) == 1:
                mapped_ans = clean_opts[remapped_correct_idxs[0]]
            else:
                mapped_ans = [clean_opts[i] for i in remapped_correct_idxs if i < len(clean_opts)]
        elif clean_opts:
            mapped_ans = clean_opts[0]

        # Auto-detect True/False questions if no options listed but answer is True/False
        if not clean_opts and isinstance(mapped_ans, str) and mapped_ans.strip().lower() in ["true", "false"]:
            clean_opts = ["True", "False"]
            mapped_ans = mapped_ans.strip().capitalize()

        if isinstance(mapped_ans, list) and len(mapped_ans) > 1:
            q_type = "multiple"
        elif len(clean_opts) >= 2:
            q_type = "mcq"
        else:
            q_type = "text"

        # Reject document titles, header metadata, or instruction blocks incorrectly parsed as text questions
        if q_type == "text":
            has_q_indicator = "?" in q_clean or bool(curr_ans_text) or bool(re.match(r'^(?:q(?:uestion)?\s*[\#\.\-]?\s*\d+|\d+[\.\)\:\-])', q_full, re.I))
            is_header_noise = bool(re.search(r'(?:total\s*marks?|duration\b|time\s*allowed|daily\s*assessment|devcon|test\s*paper|exam\s*paper|general\s*instructions|max\s*marks)', q_clean, re.I))
            
            if is_header_noise or not has_q_indicator:
                curr_q_num = None
                curr_q_lines = []
                curr_options = []
                curr_correct_indices = []
                curr_ans_text = ""
                curr_marks = 1
                return

        sections_set.add(current_section)

        questions.append({
            "id": f"q-{len(questions) + 1}",
            "type": q_type,
            "question": q_clean,
            "options": clean_opts,
            "correctAnswer": mapped_ans,
            "section": current_section,
            "marks": curr_marks
        })

        curr_q_num = None
        curr_q_lines = []
        curr_options = []
        curr_correct_indices = []
        curr_ans_text = ""
        curr_marks = 1

    has_started_questions = False

    for line in lines:
        # Ignore top header metadata before first question
        if not has_started_questions:
            if top_header_noise_pattern.search(line) or not q_start_pattern.match(line):
                # If line is header noise or not a question start before Q1, skip it
                if not q_start_pattern.match(line) or top_header_noise_pattern.search(line):
                    continue


        sec_m = section_pattern.match(line)
        if sec_m and not code_keyword_pattern.match(line):
            sec_val = sec_m.group(1).strip("] ").strip()
            if sec_val:
                finalize_current()
                current_section = sec_val
                continue

        ans_m = ans_line_pattern.match(line)
        if ans_m and not code_keyword_pattern.match(line):
            curr_ans_text = ans_m.group(1).strip()
            continue

        exp_m = explanation_pattern.match(line)
        if exp_m and not code_keyword_pattern.match(line):
            continue

        is_q_start = bool(q_start_pattern.match(line))
        is_letter_opt = bool(letter_opt_pattern.match(line))
        is_code = bool(code_keyword_pattern.match(line))
        inline_opts = _split_inline_options(line) if not is_code else []

        num_m = re.match(r'^(?:q(?:uestion)?\s*[\#\.\-]?\s*)?(\d+)[\.\)\:\-]', line, re.IGNORECASE)
        q_num_val = int(num_m.group(1)) if num_m else None

        if is_q_start and not is_letter_opt and not is_code:
            is_new_q = True
            
            # Distinguish numbered options (1., 2.) from next question (2., 3.)
            if curr_q_lines and q_num_val is not None:
                # If we haven't seen Answer line yet and already started collecting options:
                if not curr_ans_text:
                    if not curr_options and q_num_val == 1:
                        # 1) Option 1 under Q1
                        is_new_q = False
                    elif curr_options and len(curr_options) < 6:
                        # If options exist, check if line is an option or question
                        has_q_mark = "?" in line or "which" in line.lower() or "what" in line.lower() or "how" in line.lower()
                        if not has_q_mark and q_num_val != curr_q_num + 1:
                            is_new_q = False
                        elif not has_q_mark and len(curr_options) < 4:
                            is_new_q = False

            if is_new_q:
                finalize_current()
                has_started_questions = True
                curr_q_num = q_num_val if q_num_val is not None else (len(questions) + 1)
                curr_q_lines.append(line)
                continue

        if (is_letter_opt or (curr_q_lines and not is_new_q)) and not is_code:
            if inline_opts:
                for opt_text in inline_opts:
                    curr_options.append(opt_text)
            else:
                curr_options.append(line)
            continue

        if inline_opts and curr_q_lines and not is_code:
            for opt_text in inline_opts:
                curr_options.append(opt_text)
            continue

        if curr_q_lines:
            if curr_ans_text and not curr_options and not is_letter_opt and not is_q_start:
                curr_ans_text += "\n" + line
            elif not curr_options or is_code:
                curr_q_lines.append(line)
            else:
                if curr_options and not curr_ans_text:
                    curr_options[-1] += " " + line
                # If question, options, and answer are all collected, ignore trailing document noise lines
        elif is_q_start:
            has_started_questions = True
            curr_q_lines.append(line)



    finalize_current()

    return questions, list(sections_set) if sections_set else ["General"]



def _split_inline_options(line: str) -> List[str]:
    pattern = re.compile(
        r'(?:^|\s+)(\*?\s*)(?:\(([a-zA-Z1-9]\d?)\)|\[([a-zA-Z1-9]\d?)\]|(?:option|choice)\s+[a-zA-Z1-9]\d?\s*[\-\.\)\:\–]?|([a-zA-Z1-9]\d?)\s*[\-\.\)\:\–])(?=\s+|$)',
        re.IGNORECASE
    )
    matches = list(pattern.finditer(line))
    if not matches:
        return []

    # If only 1 match, verify if line starts with option pattern
    if len(matches) == 1:
        if matches[0].start() > 2:
            return []

    options = []
    for i in range(len(matches)):
        start_idx = matches[i].start()
        end_idx = matches[i + 1].start() if i + 1 < len(matches) else len(line)
        opt_chunk = line[start_idx:end_idx].strip()
        
        cleaned_chunk = pattern.sub('', opt_chunk, count=1).strip()
        if opt_chunk.startswith("*") or matches[i].group(1).strip() == "*":
            cleaned_chunk = f"*{cleaned_chunk}"
        if cleaned_chunk:
            options.append(cleaned_chunk)

    return options


def _map_correct_answer(raw_ans: Any, options: List[str]) -> Any:
    if isinstance(raw_ans, list):
        mapped_list = []
        for a in raw_ans:
            m = _map_correct_answer(a, options)
            if isinstance(m, list):
                mapped_list.extend(m)
            elif m:
                mapped_list.append(m)
        return mapped_list

    raw_str = str(raw_ans).strip()
    if not raw_str:
        return ""

    if not options:
        return raw_str

    letter_map = {}
    for i in range(26):
        letter_map[chr(ord('A') + i)] = i
        letter_map[chr(ord('a') + i)] = i
    for i in range(1, 100):
        letter_map[str(i)] = i - 1

    split_parts = re.split(r'[,&]|\band\b', raw_str, flags=re.IGNORECASE)
    if len(split_parts) > 1:
        res = []
        for part in split_parts:
            m = _map_correct_answer(part.strip(), options)
            if isinstance(m, str) and m and m not in res:
                res.append(m)
            elif isinstance(m, list):
                for item in m:
                    if item not in res:
                        res.append(item)
        if res:
            return res

    clean_raw = raw_str.strip()

    letter_match = re.search(r'^(?:option|choice|ans(?:wer)?|key|\()?([a-zA-Z]|\d+)[\)\.]?$', clean_raw, re.IGNORECASE)
    if letter_match:
        let = letter_match.group(1)
        if let in letter_map:
            idx = letter_map[let]
            if idx < len(options):
                return options[idx]

    for opt in options:
        if opt.strip().lower() == clean_raw.lower():
            return opt

    prefix_stripped = re.sub(r'^(?:option|choice|ans(?:wer)?|\()?([a-zA-Z]|\d+)[\)\.\:\s]+', '', clean_raw, flags=re.IGNORECASE).strip()
    if prefix_stripped:
        for opt in options:
            if opt.strip().lower() == prefix_stripped.lower():
                return opt

    for opt in options:
        if clean_raw.lower() in opt.strip().lower() or opt.strip().lower() in clean_raw.lower():
            return opt

    return raw_str

