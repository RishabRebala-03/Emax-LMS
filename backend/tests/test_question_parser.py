import unittest
import io
from services.question_parser import parse_questions_file, docx

class TestQuestionParser(unittest.TestCase):

    def test_standard_txt_mcq(self):
        text = """
        Total Marks: 100
        Subject: ABAP Programming
        Daily Assessment Test Paper

        1. What is Python?
        A. A programming language
        B. A type of snake only
        C. A database system
        D. An operating system
        Answer: A

        2. Which of the following are prime numbers?
        A) 2
        B) 4
        C) 3
        D) 6
        Ans: A, C
        """
        questions, sections = parse_questions_file(text.encode('utf-8'), 'test.txt')
        self.assertEqual(len(questions), 2)
        
        self.assertEqual(questions[0]['question'], 'What is Python?')
        self.assertEqual(len(questions[0]['options']), 4)
        self.assertEqual(questions[0]['correctAnswer'], 'A programming language')
        self.assertEqual(questions[0]['type'], 'mcq')

        self.assertEqual(questions[1]['question'], 'Which of the following are prime numbers?')
        self.assertEqual(questions[1]['correctAnswer'], ['2', '3'])
        self.assertEqual(questions[1]['type'], 'multiple')

    def test_hyphenated_options_and_colonless_answers(self):
        text = """
        14. 12 - Which of the following Transaction code can be used to create a new G/L account? 
        A - FS00 
        B - OB53 
        C - OBD4 
        D - OB13
        Answer   A

        15. Which of the following is a smallest unit in an organization for which financial statements can be generated?
         A - A Company
         B - Company Code 
        C - Functional area
         D - Credit Control
        Answer B
        """
        questions, sections = parse_questions_file(text.encode('utf-8'), 'test.txt')
        self.assertEqual(len(questions), 2)

        self.assertEqual(questions[0]['type'], 'mcq')
        self.assertEqual(questions[0]['options'], ['FS00', 'OB53', 'OBD4', 'OB13'])
        self.assertEqual(questions[0]['correctAnswer'], 'FS00')

        self.assertEqual(questions[1]['type'], 'mcq')
        self.assertEqual(questions[1]['options'], ['A Company', 'Company Code', 'Functional area', 'Credit Control'])
        self.assertEqual(questions[1]['correctAnswer'], 'Company Code')

    def test_numbered_options(self):
        text = """
        1. What is the capital of France?
        1) London
        2) Paris
        3) Berlin
        4) Madrid
        Answer: 2
        """
        questions, sections = parse_questions_file(text.encode('utf-8'), 'test.txt')
        self.assertEqual(len(questions), 1)
        self.assertEqual(questions[0]['question'], 'What is the capital of France?')
        self.assertEqual(len(questions[0]['options']), 4)
        self.assertEqual(questions[0]['correctAnswer'], 'Paris')

    def test_30_questions_parsing(self):
        lines = []
        for i in range(1, 31):
            lines.append(f"{i}. Question number {i} regarding subject area in ABAP?")
            lines.append("A) Option A")
            lines.append("B) Option B")
            lines.append("C) Option C")
            lines.append("D) Option D")
            lines.append("Ans: A\n")
        text = "\n".join(lines)
        questions, sections = parse_questions_file(text.encode('utf-8'), 'test.txt')
        self.assertEqual(len(questions), 30)
        self.assertEqual(questions[0]['question'], 'Question number 1 regarding subject area in ABAP?')
        self.assertEqual(questions[29]['question'], 'Question number 30 regarding subject area in ABAP?')
        self.assertEqual(questions[29]['correctAnswer'], 'Option A')

    def test_docx_30_questions(self):
        if not docx:
            self.skipTest("python-docx package not installed")
        
        doc = docx.Document()
        doc.add_paragraph("SAP ABAP Day 1 to Day 5 Assessment")
        doc.add_paragraph("Total Marks: 30 | Time: 45 Mins")

        for i in range(1, 31):
            doc.add_paragraph(f"{i}. Which ABAP DDIC object defines question number {i}?")
            doc.add_paragraph("A) Data element")
            doc.add_paragraph("B) Domain")
            doc.add_paragraph("C) Structure")
            doc.add_paragraph("D) Table type")
            doc.add_paragraph("Ans: A")

        buf = io.BytesIO()
        doc.save(buf)
        file_bytes = buf.getvalue()

        questions, sections = parse_questions_file(file_bytes, 'SAP_ABAP_Day1_to_Day5_30_MCQs test 1.docx')
        self.assertEqual(len(questions), 30)
        self.assertEqual(questions[0]['question'], 'Which ABAP DDIC object defines question number 1?')
        self.assertEqual(questions[29]['question'], 'Which ABAP DDIC object defines question number 30?')

    def test_asterisk_marked_options(self):
        text = """
        1. What is 2 + 2?
        A. 3
        *B. 4
        C. 5
        D. 6
        """
        questions, sections = parse_questions_file(text.encode('utf-8'), 'test.txt')
        self.assertEqual(len(questions), 1)
        self.assertEqual(questions[0]['correctAnswer'], '4')

    def test_inline_options(self):
        text = """
        1. What is 2 + 2?
        (A) 3  (B) 4  (C) 5  (D) 6
        Ans: B
        """
        questions, sections = parse_questions_file(text.encode('utf-8'), 'test.txt')
        self.assertEqual(len(questions), 1)
        self.assertEqual(len(questions[0]['options']), 4)
        self.assertEqual(questions[0]['correctAnswer'], '4')

    def test_subjective_text_question(self):
        text = """
        1. Explain the theory of relativity. [5 marks]
        Answer: The theory of relativity, developed by Albert Einstein, includes both special and general relativity.
        It transformed theoretical physics and astronomy during the 20th century.
        """
        questions, sections = parse_questions_file(text.encode('utf-8'), 'test.txt')
        self.assertEqual(len(questions), 1)
        self.assertEqual(questions[0]['type'], 'text')
        self.assertEqual(questions[0]['marks'], 5)
        self.assertIn('Albert Einstein', questions[0]['correctAnswer'])

    def test_abap_code_protection(self):
        text = """
        1. What will be the output of the following code?
        DATA: lv_count TYPE i VALUE 10.
        WRITE lv_count.

        A) 10
        B) 0
        C) Syntax Error
        Ans: A
        """
        questions, sections = parse_questions_file(text.encode('utf-8'), 'test.txt')
        self.assertEqual(len(questions), 1)
        self.assertIn('DATA: lv_count TYPE i VALUE 10.', questions[0]['question'])
        self.assertEqual(questions[0]['correctAnswer'], '10')

    def test_docx_blob_filename_and_zip_fallback(self):
        if not docx:
            self.skipTest("python-docx package not installed")

        doc = docx.Document()
        doc.add_paragraph("1. What is the capital of France?")
        doc.add_paragraph("A) London")
        doc.add_paragraph("B) Paris")
        doc.add_paragraph("C) Berlin")
        doc.add_paragraph("D) Madrid")
        doc.add_paragraph("Ans: B")

        buf = io.BytesIO()
        doc.save(buf)
        file_bytes = buf.getvalue()

    def test_checkmark_answer_line_cleaning(self):
        text = """
        Q2. Which statement removes selected rows from an internal table?
        ✓ Answer: A) DELETE
        A) DELETE
        B) CLEAR
        C) REMOVE
        D) DROP
        """
        questions, sections = parse_questions_file(text.encode('utf-8'), 'test.txt')
        self.assertEqual(len(questions), 1)
        self.assertEqual(questions[0]['question'], 'Which statement removes selected rows from an internal table?')
        self.assertEqual(questions[0]['correctAnswer'], 'DELETE')
        self.assertNotIn('Answer', questions[0]['question'])

if __name__ == '__main__':
    unittest.main()
