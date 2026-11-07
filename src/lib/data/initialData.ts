export interface LocalizedText {
  ar: string
  en: string
}

export type AccessType = 'public' | 'restricted'
export type ResourceType = 'notes' | 'summary' | 'source' | 'prep' | 'pastExam' | 'other'
export type ActivityKind = 'exam' | 'assignment'
export type ReportCategory = 'course' | 'lab' | 'project'
export type SlotKind = 'lecture' | 'lab'
export type ExceptionType = 'cancelled' | 'moved' | 'room'

export interface FileItem {
  id: string
  name: string
  size: string
  access: AccessType
  broken?: boolean
}

export interface Course {
  id: string
  code: string
  name: LocalizedText
  instructor: LocalizedText
  color: string
  credits: number
  desc: LocalizedText
}

export interface Slot {
  id: string
  courseId: string
  weekday: number // 0 = Sunday, 1 = Monday ... 4 = Thursday
  start: string
  end: string
  room: string
  kind: SlotKind
}

export interface ScheduleException {
  id: string
  slotId: string
  offset: number // day offset relative to current week Sunday
  type: ExceptionType
  start?: string
  end?: string
  room?: string
  note: LocalizedText
}

export interface Resource {
  id: string
  courseId: string
  type: ResourceType
  title: LocalizedText
  date: number
  files: FileItem[]
}

export interface Activity {
  id: string
  courseId: string
  kind: ActivityKind
  title: LocalizedText
  due: number // days from today
  time: string
  place: LocalizedText
  desc: LocalizedText
  files: FileItem[]
}

export interface Report {
  id: string
  category: ReportCategory
  courseId: string
  title: LocalizedText
  author: LocalizedText
  date: number
  files: FileItem[]
}

export const dayFrom = (offset: number) => {
  const d = new Date()
  d.setHours(0, 0, 0, 0)
  d.setDate(d.getDate() + offset)
  return d
}


export const initialCourses: Course[] = [
  {
    id: 'c1',
    code: 'CS 201',
    name: { ar: 'هياكل البيانات', en: 'Data Structures' },
    instructor: { ar: 'أ.م. نور حسن حسون', en: 'Asst. Prof. Noor Hasan Hassoon' },
    color: '#1f3d6b',
    credits: 3,
    desc: {
      ar: 'المكدس والطوابير والقوائم المتصلة والأشجار مع جانب عملي.',
      en: 'Stacks, queues, linked lists and trees with a practical lab.',
    },
  },
  {
    id: 'c2',
    code: 'CS 202',
    name: { ar: 'قواعد البيانات', en: 'Databases' },
    instructor: { ar: 'أ.د. علي محمد صالح', en: 'Prof. Ali Mohammed Salih' },
    color: '#2f6b5a',
    credits: 3,
    desc: {
      ar: 'النمذجة العلائقية ولغة SQL والتطبيع مع جانب عملي.',
      en: 'Relational modeling, SQL and normalization with a practical lab.',
    },
  },
  {
    id: 'c3',
    code: 'CS 203',
    name: { ar: 'البرمجة الكيانية', en: 'Object-Oriented Programming' },
    instructor: { ar: 'أ.م.د. عادل عبدالغني عبدالوهاب', en: 'Asst. Prof. Dr. Adel Abdulghani Abdulwahab' },
    color: '#8a4b2f',
    credits: 3,
    desc: {
      ar: 'الأصناف والكائنات والوراثة وتعدد الأشكال مع جانب عملي.',
      en: 'Classes, objects, inheritance and polymorphism with a practical lab.',
    },
  },
  {
    id: 'c4',
    code: 'CS 204',
    name: { ar: 'المعالجات المايكروية', en: 'Microprocessors' },
    instructor: { ar: 'م.د. سعد عبدالعزيز شعبان', en: 'Dr. Saad Abdulaziz Shaaban' },
    color: '#5b3f86',
    credits: 3,
    desc: {
      ar: 'معمارية المعالج ولغة التجميع والمقاطعات مع جانب عملي.',
      en: 'Processor architecture, assembly language and interrupts with a lab.',
    },
  },
  {
    id: 'c5',
    code: 'CS 205',
    name: { ar: 'التحليل العددي', en: 'Numerical Analysis' },
    instructor: { ar: 'أ.د. ارشد ادهم احمد', en: 'Prof. Arshad Adham Ahmed' },
    color: '#b5832f',
    credits: 3,
    desc: {
      ar: 'حل المعادلات والاستكمال والتكامل العددي مع جانب عملي.',
      en: 'Root finding, interpolation and numerical integration with a lab.',
    },
  },
  {
    id: 'c6',
    code: 'MATH 206',
    name: { ar: 'النظرية الاحتسابية', en: 'Theory of Computation' },
    instructor: { ar: 'م.د. قاسم ردام اسماعيل', en: 'Dr. Qasim Radam Ismail' },
    color: '#2d6a8a',
    credits: 2,
    desc: {
      ar: 'نظرية الاحتسابية واللغات الصورية والأوتوماتا والتطبيقات الحسابية.',
      en: 'Theory of computation, formal languages, automata, and computational models.',
    },
  },
  {
    id: 'c7',
    code: 'EDU 207',
    name: { ar: 'المناهج والكتب المدرسية', en: 'Curricula & Textbooks' },
    instructor: { ar: 'م.د. ساهر محمود كاظم', en: 'Dr. Saher Mahmoud Kadhim' },
    color: '#7a5c2e',
    credits: 2,
    desc: {
      ar: 'أسس بناء المناهج وتحليل الكتب المدرسية مع تطبيق عملي.',
      en: 'Curriculum foundations and textbook analysis with practical work.',
    },
  },
  {
    id: 'c8',
    code: 'EDU 208',
    name: { ar: 'القيادة والإدارة التربوية', en: 'Educational Leadership & Administration' },
    instructor: { ar: 'أ.م.د. وسام عماد عبدالغني', en: 'Asst. Prof. Dr. Wisam Imad Abdulghani' },
    color: '#3f6b3a',
    credits: 2,
    desc: {
      ar: 'مفاهيم القيادة والإدارة في المؤسسات التعليمية.',
      en: 'Leadership and management concepts in educational institutions.',
    },
  },
  {
    id: 'c9',
    code: 'GEN 209',
    name: { ar: 'اللغة الإنكليزية', en: 'English Language' },
    instructor: { ar: 'م.د. انتصار احمد الماشي', en: 'Dr. Intisar Ahmed Al-Mashi' },
    color: '#8a2f4f',
    credits: 1,
    desc: {
      ar: 'مهارات القراءة والكتابة والمصطلحات العلمية.',
      en: 'Reading, writing and scientific terminology.',
    },
  },
  {
    id: 'c10',
    code: 'GEN 210',
    name: { ar: 'اللغة العربية', en: 'Arabic Language' },
    instructor: { ar: 'م. اسراء طالب محمد', en: 'Lect. Israa Talib Mohammed' },
    color: '#6b4f2f',
    credits: 1,
    desc: {
      ar: 'قواعد اللغة ومهارات التعبير والكتابة.',
      en: 'Grammar, expression and writing skills.',
    },
  },
  {
    id: 'c11',
    code: 'EDU 211',
    name: { ar: 'تعلم التفكير', en: 'Learning to Think' },
    instructor: { ar: 'م.م. رنا شامر علاي', en: 'Asst. Lect. Rana Shamer Allay' },
    color: '#2f5f6b',
    credits: 1,
    desc: {
      ar: 'مهارات التفكير الناقد والإبداعي وحل المشكلات.',
      en: 'Critical and creative thinking and problem solving.',
    },
  },
  {
    id: 'c12',
    code: 'GEN 212',
    name: { ar: 'جرائم حزب البعث', en: 'Crimes of the Baath Party' },
    instructor: { ar: 'م.م. باسم سعدون', en: 'Asst. Lect. Basim Saadoon' },
    color: '#5a5a5a',
    credits: 1,
    desc: {
      ar: 'مادة وزارية عامة.',
      en: 'General ministry-mandated course.',
    },
  },
]

export const initialSlots: Slot[] = [
  { id: 's1', courseId: 'c1', weekday: 0, start: '08:30', end: '10:30', room: 'Hall 2', kind: 'lecture' },
  { id: 's2', courseId: 'c3', weekday: 0, start: '10:30', end: '12:30', room: 'Hall 2', kind: 'lecture' },
  { id: 's3', courseId: 'c3', weekday: 0, start: '12:30', end: '14:30', room: 'Lab G1+G2', kind: 'lab' },
  { id: 's4', courseId: 'c7', weekday: 1, start: '08:30', end: '09:30', room: 'Hall 2', kind: 'lecture' },
  { id: 's5', courseId: 'c12', weekday: 1, start: '09:30', end: '10:30', room: 'Hall 2', kind: 'lecture' },
  { id: 's6', courseId: 'c2', weekday: 1, start: '10:30', end: '12:30', room: 'Hall 2', kind: 'lecture' },
  { id: 's7', courseId: 'c4', weekday: 1, start: '12:30', end: '14:30', room: 'Hall 2', kind: 'lecture' },
  { id: 's8', courseId: 'c8', weekday: 2, start: '08:30', end: '10:30', room: 'Hall 2', kind: 'lecture' },
  { id: 's9', courseId: 'c5', weekday: 2, start: '10:30', end: '11:30', room: 'Hall 2', kind: 'lecture' },
  { id: 's10', courseId: 'c9', weekday: 2, start: '11:30', end: '12:30', room: 'Hall 2', kind: 'lecture' },
  { id: 's11', courseId: 'c5', weekday: 2, start: '12:30', end: '14:30', room: 'Lab G3+G4', kind: 'lab' },
  { id: 's12', courseId: 'c6', weekday: 3, start: '08:30', end: '10:30', room: 'Hall 2', kind: 'lecture' },
  { id: 's13', courseId: 'c1', weekday: 3, start: '10:30', end: '12:30', room: 'Lab G1-G3', kind: 'lab' },
  { id: 's14', courseId: 'c4', weekday: 3, start: '12:30', end: '14:30', room: 'Lab G1-G3', kind: 'lab' },
  { id: 's15', courseId: 'c2', weekday: 4, start: '08:30', end: '10:30', room: 'Lab G1-G3', kind: 'lab' },
  { id: 's16', courseId: 'c11', weekday: 4, start: '10:30', end: '11:30', room: 'Hall 4', kind: 'lecture' },
  { id: 's17', courseId: 'c10', weekday: 4, start: '11:30', end: '12:30', room: 'Hall 4', kind: 'lecture' },
  { id: 's18', courseId: 'c7', weekday: 4, start: '12:30', end: '14:30', room: 'Practical G1+G2', kind: 'lab' },
]

export const initialExceptions: ScheduleException[] = []

export const initialResources: Resource[] = [
  // --- Course 1: Data Structures (هياكل البيانات) ---
  {
    id: 'res-c1-lectures',
    courseId: 'c1',
    type: 'notes',
    title: { ar: 'ملازم ومحاضرات هياكل البيانات الرسمية (المحاضرات 1 إلى 9)', en: 'Official Data Structures Lectures (Lectures 01 to 09)' },
    date: -2,
    files: [
      { id: 'f-ds-01', name: 'Data_Structures_Lecture_01_Introduction_and_Memory_Representation.pdf', size: '720 KB', access: 'public' },
      { id: 'f-ds-02', name: 'Data_Structures_Lecture_02_Linear_Structures_and_Arrays.pdf', size: '550 KB', access: 'public' },
      { id: 'f-ds-03', name: 'Data_Structures_Lecture_03_Stack_Using_Array.pdf', size: '430 KB', access: 'public' },
      { id: 'f-ds-04', name: 'Data_Structures_Lecture_04_Stack_Applications_Infix_to_Postfix.pdf', size: '1.2 MB', access: 'public' },
      { id: 'f-ds-09', name: 'Data_Structures_Lecture_09_Searching_and_Sorting.pdf', size: '250 KB', access: 'public' },
      { id: 'f-ds-alloc', name: 'Data_Structures_Lecture_Storage_Allocation.pdf', size: '260 KB', access: 'public' },
    ],
  },
  {
    id: 'res-c1-chapters',
    courseId: 'c1',
    type: 'summary',
    title: { ar: 'فصول ودفتر ملاحظات هياكل البيانات الشامل', en: 'Data Structures Advanced Topics & Notebook' },
    date: -4,
    files: [
      { id: 'f-ds-ch3', name: 'Data_Structures_Ch03_Queue_and_Circular_Queue.pdf', size: '1.7 MB', access: 'public' },
      { id: 'f-ds-ch5', name: 'Data_Structures_Ch05_Recursion_and_Recursive_Functions.pdf', size: '1.9 MB', access: 'public' },
      { id: 'f-ds-ch7', name: 'Data_Structures_Ch07_Trees_and_Binary_Search_Trees.pdf', size: '1.6 MB', access: 'public' },
      { id: 'f-ds-cpp', name: 'Data_Structures_Linked_Stack_and_Queue_in_CPP.pdf', size: '1.2 MB', access: 'public' },
      { id: 'f-ds-trace', name: 'Data_Structures_Stack_Operations_Tracing_Examples.pdf', size: '670 KB', access: 'public' },
      { id: 'f-ds-notebook', name: 'Data_Structures_Comprehensive_Course_Notes_Notebook.pdf', size: '16.0 MB', access: 'public' },
    ],
  },

  // --- Course 2: Databases (قواعد البيانات) ---
  {
    id: 'res-c2-main',
    courseId: 'c2',
    type: 'source',
    title: { ar: 'الكتاب المنهجي الرسمي ودليل المختبر: أنظمة قواعد البيانات', en: 'Database Systems Textbook & MS Access Lab Manual' },
    date: -3,
    files: [
      { id: 'f-db-book', name: 'Database_Systems_Complete_Course_Book_Dr_Ali.pdf', size: '4.2 MB', access: 'public' },
      { id: 'f-db-lab', name: 'Database_Lab_Microsoft_Access_2010_Basics.pdf', size: '2.8 MB', access: 'public' },
    ],
  },

  // --- Course 3: OOP & C++ (البرمجة الكيانية) ---
  {
    id: 'res-c3-main',
    courseId: 'c3',
    type: 'notes',
    title: { ar: 'ملازم ومراجعات البرمجة المتقدمة والمختبر العملي OOP', en: 'OOP & C++ Advanced Programming Lectures & Reviews' },
    date: -5,
    files: [
      { id: 'f-oop-lab', name: 'Programming_OOP_Lab_and_Fundamentals_Summary.pdf', size: '27.4 MB', access: 'public' },
      { id: 'f-cpp-fn', name: 'Programming_CPP_Term2_Functions_Summary.pdf', size: '25.0 MB', access: 'public' },
      { id: 'f-cpp-arr', name: 'Programming_CPP_Term2_Exam_Review_2D_Arrays.pdf', size: '26.9 MB', access: 'public' },
      { id: 'f-cpp-loops', name: 'Programming_CPP_Loop_Examples_and_Exercises.pdf', size: '6.5 MB', access: 'public' },
    ],
  },

  // --- Course 4: Microprocessors (المعالجات المايكروية) ---
  {
    id: 'res-c4-main',
    courseId: 'c4',
    type: 'source',
    title: { ar: 'كتاب معمارية المعالج 8086، الترجمة العربية ومخططات التوقيت', en: 'Microprocessor 8086 Textbook, Translation & Timing Diagrams' },
    date: -6,
    files: [
      { id: 'f-mp-book', name: 'Microprocessors_8086_Complete_Course_Book.pdf', size: '1.6 MB', access: 'public' },
      { id: 'f-mp-trans', name: 'Microprocessors_8086_Course_Book_Arabic_Translation.pdf', size: '19.9 MB', access: 'public' },
      { id: 'f-mp-time', name: 'Microprocessors_8086_Timing_Diagrams.pdf', size: '290 KB', access: 'public' },
    ],
  },

  // --- Course 5: Numerical Analysis (التحليل العددي) ---
  {
    id: 'res-c5-lectures-1',
    courseId: 'c5',
    type: 'notes',
    title: { ar: 'محاضرات التحليل العددي - الجزء الأول (المحاضرات 01 إلى 08)', en: 'Numerical Analysis Lectures - Part 1 (Lectures 01 to 08)' },
    date: -7,
    files: [
      { id: 'f-num-01', name: 'Numerical_Analysis_Lecture_01_Type_of_Errors.pdf', size: '240 KB', access: 'public' },
      { id: 'f-num-02', name: 'Numerical_Analysis_Lecture_02_Bisection_Method.pdf', size: '310 KB', access: 'public' },
      { id: 'f-num-03', name: 'Numerical_Analysis_Lecture_03_False_Position_Method.pdf', size: '230 KB', access: 'public' },
      { id: 'f-num-04', name: 'Numerical_Analysis_Lecture_04_Newton_Raphson_Method.pdf', size: '160 KB', access: 'public' },
      { id: 'f-num-05', name: 'Numerical_Analysis_Lecture_05_Secant_Method.pdf', size: '210 KB', access: 'public' },
      { id: 'f-num-06', name: 'Numerical_Analysis_Lecture_06_System_of_Linear_Equations.pdf', size: '560 KB', access: 'public' },
      { id: 'f-num-07', name: 'Numerical_Analysis_Lecture_07_Gauss_Elimination_Method.pdf', size: '580 KB', access: 'public' },
      { id: 'f-num-08', name: 'Numerical_Analysis_Lecture_08_Gauss_Jordan_Method.pdf', size: '900 KB', access: 'public' },
    ],
  },
  {
    id: 'res-c5-lectures-2',
    courseId: 'c5',
    type: 'notes',
    title: { ar: 'محاضرات التحليل العددي - الجزء الثاني (المحاضرات 09 إلى 16)', en: 'Numerical Analysis Lectures - Part 2 (Lectures 09 to 16)' },
    date: -8,
    files: [
      { id: 'f-num-09', name: 'Numerical_Analysis_Lecture_09_Gauss_Jacobi_Iteration_Method.pdf', size: '770 KB', access: 'public' },
      { id: 'f-num-10', name: 'Numerical_Analysis_Lecture_10_Gauss_Seidel_Iteration_Method.pdf', size: '730 KB', access: 'public' },
      { id: 'f-num-11', name: 'Numerical_Analysis_Lecture_11_Lagrange_Interpolation_Polynomial.pdf', size: '580 KB', access: 'public' },
      { id: 'f-num-12', name: 'Numerical_Analysis_Lecture_12_Newton_Divided_Differences.pdf', size: '430 KB', access: 'public' },
      { id: 'f-num-13', name: 'Numerical_Analysis_Lecture_13_Trapezoidal_Rule_Numerical_Integration.pdf', size: '280 KB', access: 'public' },
      { id: 'f-num-14', name: 'Numerical_Analysis_Lecture_14_Simpsons_Rule_Numerical_Integration.pdf', size: '250 KB', access: 'public' },
      { id: 'f-num-15', name: 'Numerical_Analysis_Lecture_15_Euler_Method_for_ODEs.pdf', size: '760 KB', access: 'public' },
      { id: 'f-num-16', name: 'Numerical_Analysis_Lecture_16_Runge_Kutta_Method_for_ODEs.pdf', size: '120 KB', access: 'public' },
    ],
  },
  {
    id: 'res-c5-matlab',
    courseId: 'c5',
    type: 'prep',
    title: { ar: 'تجارب واختبارات مختبر MATLAB العملي', en: 'MATLAB Practical Lab Manuals & Quizzes' },
    date: -9,
    files: [
      { id: 'f-mat-01', name: 'MATLAB_Lab_01_Numbers_and_Complex_Numbers.pdf', size: '1.6 MB', access: 'public' },
      { id: 'f-mat-02', name: 'MATLAB_Lab_02_Matrices_and_Basic_Operations.pdf', size: '2.2 MB', access: 'public' },
      { id: 'f-mat-03', name: 'MATLAB_Lab_03_Vectors_and_Special_Matrices.pdf', size: '360 KB', access: 'public' },
      { id: 'f-mat-04', name: 'MATLAB_Lab_04_Polynomials_and_Roots.pdf', size: '250 KB', access: 'public' },
      { id: 'f-mat-q1', name: 'MATLAB_Lab_Exam_Quiz_01.pdf', size: '180 KB', access: 'public' },
      { id: 'f-mat-q2', name: 'MATLAB_Lab_Exam_Quiz_02.pdf', size: '150 KB', access: 'public' },
    ],
  },

  // --- Course 6: Theory of Computation (النظرية الاحتسابية) ---
  {
    id: 'res-c6-main',
    courseId: 'c6',
    type: 'notes',
    title: { ar: 'دفتر وملازم مادة النظرية الاحتسابية والأوتوماتا الشاملة', en: 'Computation Theory & Automata Complete Notebook' },
    date: -10,
    files: [
      { id: 'f-th-notebook', name: 'Computation_Theory_Automata_Complete_Notebook.pdf', size: '17.0 MB', access: 'public' },
    ],
  },

  // --- Course 7: Curricula & Textbooks (المناهج والكتب المدرسية) ---
  {
    id: 'res-c7-main',
    courseId: 'c7',
    type: 'source',
    title: { ar: 'الكتاب الدراسي المعتمد لمادة المناهج والكتب المدرسية', en: 'Curricula and School Textbooks Course Book' },
    date: -11,
    files: [
      { id: 'f-edu-cur', name: 'Curricula_and_School_Textbooks_Course_Book.pdf', size: '680 KB', access: 'public' },
    ],
  },

  // --- Course 8: Educational Leadership (القيادة والإدارة التربوية) ---
  {
    id: 'res-c8-main',
    courseId: 'c8',
    type: 'source',
    title: { ar: 'كتاب الإدارة والإشراف التربوي - أ.م.د. وسام عماد', en: 'Educational Administration and Supervision Course Book' },
    date: -12,
    files: [
      { id: 'f-edu-adm', name: 'Educational_Administration_and_Supervision_Dr_Wisam.pdf', size: '16.6 MB', access: 'public' },
    ],
  },

  // --- Course 9: English Language (اللغة الإنكليزية) ---
  {
    id: 'res-c9-main',
    courseId: 'c9',
    type: 'source',
    title: { ar: 'كتاب الطالب المعتمد لمادة اللغة الإنكليزية - Headway', en: 'New Headway Pre-Intermediate Student’s Book' },
    date: -13,
    files: [
      { id: 'f-eng-headway', name: 'English_New_Headway_Pre_Intermediate_Students_Book.pdf', size: '41.1 MB', access: 'public' },
    ],
  },

  // --- Course 10: Arabic Language (اللغة العربية) ---
  {
    id: 'res-c10-main',
    courseId: 'c10',
    type: 'source',
    title: { ar: 'كتاب مادة اللغة العربية - المرحلة الثانية', en: 'Arabic Language Course Book - Stage 2' },
    date: -14,
    files: [
      { id: 'f-ar-book', name: 'Arabic_Language_Stage2_Course_Book.pdf', size: '1.3 MB', access: 'public' },
    ],
  },

  // --- Course 11: Learning to Think (تعلم التفكير) ---
  {
    id: 'res-c11-main',
    courseId: 'c11',
    type: 'notes',
    title: { ar: 'محاضرات مادة مهارات التفكير وملحق الأسئلة والأجوبة', en: 'Thinking Skills Course Lectures & Q&A Supplement' },
    date: -15,
    files: [
      { id: 'f-think-lec', name: 'Thinking_Skills_Course_Lectures_Rana_Thamer.pdf', size: '1.2 MB', access: 'public' },
      { id: 'f-think-qa', name: 'Thinking_Skills_Course_Supplement_Q_and_A.pdf', size: '490 KB', access: 'public' },
    ],
  },

  // --- Course 12: Crimes of the Baath Party (جرائم حزب البعث) ---
  {
    id: 'res-c12-main',
    courseId: 'c12',
    type: 'source',
    title: { ar: 'كتاب مادة جرائم نظام البعث في العراق', en: 'Crimes of the Baath Regime in Iraq Course Book' },
    date: -1,
    files: [
      { id: 'f-baath-book', name: 'Baath_Party_Crimes_in_Iraq_Course_Book.pdf', size: '7.7 MB', access: 'public' },
    ],
  },
]

export const initialActivities: Activity[] = [
  {
    id: 'act-off-1',
    courseId: 'c4',
    kind: 'exam',
    title: { ar: 'امتحان نصف الفصل: أنظمة قواعد البيانات', en: 'Midterm Exam: Database Systems' },
    due: 3,
    time: '12:30',
    place: { ar: 'القاعة 2', en: 'Hall 2' },
    desc: {
      ar: 'المادة تشمل الفصول الثلاثة الأولى: العلاقات، الجبر العلائقي، ولغة SQL.',
      en: 'Covers first 3 chapters: Relational Model, Relational Algebra, and SQL.',
    },
    files: [
      { id: 'f-db-syl', name: 'Exam_Syllabus_Topics.pdf', size: '420 KB', access: 'public' },
    ],
  },
  {
    id: 'act-off-2',
    courseId: 'c1',
    kind: 'assignment',
    title: { ar: 'واجب برمجي: خوارزمية البحث في الأشجار الثنائية', en: 'Assignment: Binary Search Tree Implementation' },
    due: 5,
    time: '23:59',
    place: { ar: 'تسليم إلكتروني', en: 'Online Submission' },
    desc: {
      ar: 'كتابة برنامج بلغة C++ لبناء شجرة بحث ثنائية وتنفيذ عمليات الإضافة والحذف والتجوال.',
      en: 'Implement a BST in C++ with insert, delete, and in-order traversal.',
    },
    files: [
      { id: 'f-ds-req', name: 'Assignment_Requirements.pdf', size: '610 KB', access: 'public' },
    ],
  },
  {
    id: 'act-off-3',
    courseId: 'c3',
    kind: 'exam',
    title: { ar: 'امتحان عملي: معمارية الحاسوب ولغة التجميع', en: 'Practical Exam: Computer Architecture' },
    due: 7,
    time: '12:30',
    place: { ar: 'المختبر G1', en: 'Lab G1' },
    desc: {
      ar: 'تطبيق عملي لكتابة دوال بلغة Assembly 8086 وتنفيذها على المعالج.',
      en: 'Assembly 8086 practical programming and CPU register tracing.',
    },
    files: [],
  },
]

export const initialReports: Report[] = [
  {
    id: 'rep-off-1',
    category: 'course',
    courseId: 'c4',
    title: { ar: 'تقرير: مقارنة بين قواعد البيانات العلائقية وNoSQL', en: 'Report: Relational vs NoSQL Databases Comparison' },
    author: { ar: 'أحمد علي وحيدر محمد', en: 'Ahmed Ali & Haider Mohammed' },
    date: -3,
    files: [
      { id: 'f-rep-1', name: 'Relational_vs_NoSQL_Report.pdf', size: '1.9 MB', access: 'public' },
    ],
  },
  {
    id: 'rep-off-2',
    category: 'lab',
    courseId: 'c2',
    title: { ar: 'تقرير المختبر الثالث: Polymorphism في C++', en: 'Lab Report 3: Polymorphism in C++' },
    author: { ar: 'سارة خالد ومريم حسن', en: 'Sarah Khalid & Maryam Hassan' },
    date: -5,
    files: [
      { id: 'f-rep-2', name: 'OOP_Lab3_Polymorphism_Report.pdf', size: '920 KB', access: 'public' },
    ],
  },
]

