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
        items = data.get("questions") or data.get("items") or data.get("data") or []
    
    questions = []
    sections_set = set()
    
    for idx, item in enumerate(items, 1):
        q_text = str(item.get("question") or item.get("title") or item.get("q") or "").strip()
        if not q_text:
            continue
        
        q_text = re.sub(r'^(?:q(?:uestion)?[\s\.\d\)]*|\d+[\.\)]|\(\d+\))\s*', '', q_text, flags=re.IGNORECASE).strip() or q_text
        
        raw_options = item.get("options") or item.get("choices") or []
        if isinstance(raw_options, str):
            options_list = [o.strip() for o in raw_options.split(",") if o.strip()]
        else:
            options_list = [str(o).strip() for o in raw_options if str(o).strip()]
            
        # Deduplicate options while preserving order
        unique_options = []
        seen = set()
        for o in options_list:
            if o not in seen:
                seen.add(o)
                unique_options.append(o)
        options = unique_options
            
        raw_ans = item.get("correctAnswer") or item.get("answer") or item.get("correct_answer") or item.get("ans") or ""
        mapped_ans = _map_correct_answer(raw_ans, options)
        
        q_type = item.get("type")
        if not q_type:
            if isinstance(mapped_ans, list) and len(mapped_ans) > 1:
                q_type = "multiple"
            elif len(options) >= 2:
                q_type = "mcq"
            else:
                q_type = "text"
        
        section = str(item.get("section") or "General").strip() or "General"
        sections_set.add(section)
        marks = int(item.get("marks", 1))
        
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
    has_header = any(h in ["question", "q", "title", "options", "answer", "correct answer", "ans", "option a", "option 1", "opt a"] for h in header)
    
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
            q_text = row_dict.get("question") or row_dict.get("q") or row_dict.get("title") or ""
            section = row_dict.get("section") or "General"
            raw_ans = (row_dict.get("correct answer") or row_dict.get("correctanswer") or 
                       row_dict.get("answer") or row_dict.get("ans") or row_dict.get("key") or "")
            
            marks_str = row_dict.get("marks") or row_dict.get("points") or "1"
            marks = int(marks_str) if marks_str.isdigit() else 1
            q_type = row_dict.get("type")
            
            if "options" in row_dict and row_dict["options"]:
                options_list = [o.strip() for o in re.split(r'[|;]', row_dict["options"]) if o.strip()]
            else:
                for k in header:
                    if (k.startswith("option") or k.startswith("opt") or k in ["a", "b", "c", "d", "e", "f"]) and k not in ["options", "option"]:
                        if row_dict.get(k):
                            options_list.append(row_dict[k])
        else:
            q_text = row[0].strip()
            if len(row) > 1:
                raw_ans = row[-1].strip() if len(row) > 2 else ""
                options_list = [c.strip() for c in row[1:-1] if c.strip()]
        
        if not q_text:
            continue
        
        # Deduplicate options
        unique_options = []
        seen = set()
        for o in options_list:
            if o not in seen:
                seen.add(o)
                unique_options.append(o)
        options = unique_options
        
        q_text = re.sub(r'^(?:q(?:uestion)?[\s\.\d\)]*|\d+[\.\)]|\(\d+\))\s*', '', q_text, flags=re.IGNORECASE).strip() or q_text
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
    full_text = []
    
    for p in doc.paragraphs:
        if p.text.strip():
            full_text.append(p.text.strip())
            
    for table in doc.tables:
        for row in table.rows:
            row_text = " | ".join(cell.text.strip() for cell in row.cells if cell.text.strip())
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
            full_text.append(txt)
            
    return _parse_txt("\n".join(full_text))


def _parse_txt(text: str) -> Tuple[List[Dict[str, Any]], List[str]]:
    """
    Comprehensive text parser that handles all question document layouts accurately,
    filtering out document headers, title blocks, and instructions while protecting
    ABAP/code structures (CLASS...ENDCLASS, FORM...ENDFORM, etc.).
    """
    raw_lines = [line.strip() for line in text.splitlines() if line.strip()]
    if not raw_lines:
        return [], ["General"]

    # Header metadata noise pattern
    header_noise_pattern = re.compile(
        r'^(?:'
        r'.*total\s*marks?|.*duration\b|.*time\s*(?:allowed|limit)?|.*instructions?\b|'
        r'.*daily\s*assessment|.*devcon|.*test\s*paper|.*exam\s*paper|.*subject\b|'
        r'name\s*:|date\s*:|roll\s*no|college\s*:|max\s*marks|passing\s*marks|'
        r'general\s*instructions|all\s*questions\s*are\s*compulsory|page\s+\d+|'
        r'class\s*:|grade\s*:|semester\s*:'
        r')',
        re.IGNORECASE
    )

    # ABAP / Code construct protection pattern (CLASS, ENDCLASS, INTERFACE, FORM, ENDFORM, TYPES, END)
    code_keyword_pattern = re.compile(
        r'^\s*(?:class\b|endclass\b|interface\b|endinterface\b|form\b|endform\b|types\b|type\b|data\b|method\b|endmethod\b|public\b|private\b|protected\b)',
        re.IGNORECASE
    )

    # 1. Standalone Answer Key block at bottom
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

    section_pattern = re.compile(r'^(?:\[?\s*section\b[:\-\s]*|section\s+\d+[:\-\s]*)(.*)', re.IGNORECASE)
    q_start_pattern = re.compile(r'^(?:q(?:uestion)?[\s\.\d\)]*|\d+[\.\)]|\(\d+\))\s*(.+)', re.IGNORECASE)
    opt_start_pattern = re.compile(r'^(?:^|\s+)(\*?\s*)(?:\(?([a-zA-Z])[\.\)]|([a-zA-Z])[\)\.\:])(?=\s+|$)', re.IGNORECASE)
    ans_line_pattern = re.compile(r'^(?:ans(?:wer)?|correct(?:\s*answer)?|key|right\s*answer)[:\-\s]*(.+)', re.IGNORECASE)
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

        filtered_q_lines = [l for l in curr_q_lines if not header_noise_pattern.match(l)]
        if not filtered_q_lines:
            curr_q_num = None
            curr_q_lines = []
            curr_options = []
            curr_correct_indices = []
            curr_ans_text = ""
            curr_marks = 1
            return

        q_full = "\n".join(filtered_q_lines).strip()
        if not q_full:
            return

        m_match = marks_pattern.search(q_full)
        if m_match:
            try:
                curr_marks = int(m_match.group(1))
                q_full = marks_pattern.sub("", q_full).strip()
            except ValueError:
                pass

        q_clean = re.sub(r'^(?:q(?:uestion)?[\s\.\d\)]*|\d+[\.\)]|\(\d+\))\s*', '', q_full, flags=re.IGNORECASE).strip() or q_full

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

            raw_clean_opts.append(opt_str)

        # Deduplicate option strings while maintaining correct index references
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
                # Map to existing index of same option
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

        if isinstance(mapped_ans, list) and len(mapped_ans) > 1:
            q_type = "multiple"
        elif len(clean_opts) >= 2:
            q_type = "mcq"
        else:
            q_type = "text"

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

    for line in lines:
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

        if header_noise_pattern.match(line) and not curr_options:
            continue

        is_q_start = bool(q_start_pattern.match(line))
        is_opt_line = bool(opt_start_pattern.match(line))
        is_code = bool(code_keyword_pattern.match(line))
        inline_opts = _split_inline_options(line) if not is_code else []

        if is_q_start and not is_opt_line and not is_code:
            if curr_options or curr_ans_text:
                finalize_current()
            elif curr_q_lines and not curr_options:
                if re.match(r'^(?:q(?:uestion)?\s*)?\d+[\.\)]', line, re.IGNORECASE):
                    finalize_current()

            num_m = re.match(r'^(?:q(?:uestion)?\s*)?(\d+)[\.\)]', line, re.IGNORECASE)
            if num_m:
                curr_q_num = int(num_m.group(1))
            curr_q_lines.append(line)
            continue

        if inline_opts and curr_q_lines and not is_code:
            for opt_text in inline_opts:
                curr_options.append(opt_text)
            continue

        if curr_q_lines:
            if not curr_options or is_code:
                curr_q_lines.append(line)
        else:
            if not header_noise_pattern.match(line):
                curr_q_lines.append(line)

    finalize_current()

    return questions, list(sections_set) if sections_set else ["General"]


def _split_inline_options(line: str) -> List[str]:
    pattern = re.compile(r'(?:^|\s+)(\*?\s*)(?:\(?([a-zA-Z1-9])[\.\)]|([a-zA-Z1-9])[\)\.\:])(?=\s+|$)', re.IGNORECASE)
    matches = list(pattern.finditer(line))
    if not matches:
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
    for i in range(1, 21):
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

    letter_match = re.search(r'^(?:option|choice|ans(?:wer)?|key|\()?([a-zA-Z1-9])[\)\.]?$', clean_raw, re.IGNORECASE)
    if letter_match:
        let = letter_match.group(1)
        if let in letter_map:
            idx = letter_map[let]
            if idx < len(options):
                return options[idx]

    for opt in options:
        if opt.strip().lower() == clean_raw.lower():
            return opt

    prefix_stripped = re.sub(r'^(?:option|choice|ans(?:wer)?|\()?([a-zA-Z1-9])[\)\.\:\s]+', '', clean_raw, flags=re.IGNORECASE).strip()
    if prefix_stripped:
        for opt in options:
            if opt.strip().lower() == prefix_stripped.lower():
                return opt

    for opt in options:
        if clean_raw.lower() in opt.strip().lower() or opt.strip().lower() in clean_raw.lower():
            return opt

    return raw_str
