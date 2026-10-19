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

export const initialResources: Resource[] = []

export const initialActivities: Activity[] = []

export const initialReports: Report[] = []

