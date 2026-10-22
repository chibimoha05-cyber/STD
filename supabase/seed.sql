DO $$
DECLARE
    x1 RECORD;
    v_counter INT := 0;
    sql_string TEXT;
BEGIN
     CREATE TEMP TABLE IF NOT EXISTS temp_data_store (
        id_col TEXT, code_col TEXT, ar_n TEXT, en_n TEXT, ar_inst ,TEXT ,  en_inst TEXT, col_val TEXT, cr_val INT, ar_d TEXT, en_d TEXT, s_ord INT
    );
    
    DELETE FROM temp_data_store;

     INSERT INTO temp_data_store VALUES 
    ('c1', 'CS 201', 'هياكل البيانات', 'Data Structures', 'أ.م. نور حسن حسون', 'Asst. Prof. Noor Hasan Hassoon', '#1f3d6b', 3, 'المكدس والطوابير والقوائم المتصلة والأشجار مع جانب عملي.', 'Stacks, queues, linked lists and trees with a practical lab.', 1),
    ('c2', 'CS 202', 'قواعد البيانات', 'Databases', 'أ.د. علي محمد صالح', 'Prof. Ali Mohammed Salih', '#2f6b5a', 3, 'النمذجة العلائقية ولغة SQL والتطبيع مع جانب عملي.', 'Relational modeling, SQL and normalization with a practical lab.', 2),
    ('c3', 'CS 203', 'البرمجة الكيانية', 'Object-Oriented Programming', 'أ.م.د. عادل عبدالغني عبدالوهاب', 'Asst. Prof. Dr. Adel Abdulghani Abdulwahab', '#8a4b2f', 3, 'الأصناف والكائنات والوراثة وتعدد الأشكال مع جانب عملي.', 'Classes, objects, inheritance and polymorphism with a practical lab.', 3),
    ('c4', 'CS 204', 'المعالجات المايكروية', 'Microprocessors', 'م.د. سعد عبدالعزيز شعبان', 'Dr. Saad Abdulaziz Shaaban', '#5b3f86', 3, 'معمارية المعالج ولغة التجميع والمقاطعات مع جانب عملي.', 'Processor architecture, assembly language and interrupts with a lab.', 4),
    ('c5', 'CS 205', 'التحليل العددي', 'Numerical Analysis', 'أ.د. ارشد ادهم احمد', 'Prof. Arshad Adham Ahmed', '#b5832f', 3, 'حل المعادلات والاستكمال والتكامل العددي مع جانب عملي.', 'Root finding, interpolation and numerical integration with a lab.', 5),
    ('c6', 'MATH 206', 'النظرية الاحتسابية', 'Theory of Computation', 'م.د. قاسم ردام اسماعيل', 'Dr. Qasim Radam Ismail', '#2d6a8a', 2, 'نظرية الاحتسابية واللغات الصورية والأوتوماتا والتطبيقات الحسابية.', 'Theory of computation, formal languages, automata, and computational models.', 6),
    ('c7', 'EDU 207', 'المناهج والكتب المدرسية', 'Curricula & Textbooks', 'م.د. ساهر محمود كاظم', 'Dr. Saher Mahmoud Kadhim', '#7a5c2e', 2, 'أسس بناء المناهج وتحليل الكتب المدرسية مع تطبيق عملي.', 'Curriculum foundations and textbook analysis with practical work.', 7),
    ('c8', 'EDU 208', 'القيادة والإدارة التربوية', 'Educational Leadership & Administration', 'أ.م.د. وسام عماد عبدالغني', 'Asst. Prof. Dr. Wisam Imad Abdulghani', '#3f6b3a', 2, 'مفاهيم القيادة والإدارة في المؤسسات التعليمية.', 'Leadership and management concepts in educational institutions.', 8),
    ('c9', 'GEN 209', 'اللغة الإنكليزية', 'English Language', 'م.د. انتصار احمد الماشي', 'Dr. Intisar Ahmed Al-Mashi', '#8a2f4f', 1, 'مهارات القراءة والكتابة والمصطلحات العلمية.', 'Reading, writing and scientific terminology.', 9),
    ('c10', 'GEN 210', 'اللغة العربية', 'Arabic Language', 'م. اسراء طالب محمد', 'Lect. Israa Talib Mohammed', '#6b4f2f', 1, 'قواعد اللغة ومهارات التعبير والكتابة.', 'Grammar, expression and writing skills.', 10),
    ('c11', 'EDU 211', 'تعلم التفكير', 'Learning to Think', 'م.م. رنا شامر علاي', 'Asst. Lect. Rana Shamer Allay', '#2f5f6b', 1, 'مهارات التفكير الناقد والإبداعي وحل المشكلات.', 'Critical and creative thinking and problem solving.', 11),
    ('c12', 'GEN 212', 'جرائم حزب البعث', 'Crimes of the Baath Party', 'م.م. باسم سعدون', 'Asst. Lect. Basim Saadoon', '#5a5a5a', 1, 'مادة وزارية عامة.', 'General ministry-mandated course.', 12);

     FOR x1 IN SELECT * FROM temp_data_store LOOP
        v_counter := v_counter + 1;
        
        sql_string := 'insert into public.courses (id, code, name_ar, name_en, instructor_ar, instructor_en, color, credits, desc_ar, desc_en, sort_order) values (' ||
                      quote_literal(x1.id_col) || ', ' || quote_literal(x1.code_col) || ', ' || quote_literal(x1.ar_n) || ', ' || quote_literal(x1.en_n) || ', ' || 
                      quote_literal(x1.ar_inst) || ', ' || quote_literal(x1.en_inst) || ', ' || quote_literal(x1.col_val) || ', ' || x1.cr_val || ', ' || 
                      quote_literal(x1.ar_d) || ', ' || quote_literal(x1.en_d) || ', ' || x1.s_ord || ') ' ||
                      'on conflict (id) do update set code = excluded.code, name_ar = excluded.name_ar, name_en = excluded.name_en, ' ||
                      'instructor_ar = excluded.instructor_ar, instructor_en = excluded.instructor_en, color = excluded.color, ' ||
                      'credits = excluded.credits, desc_ar = excluded.desc_ar, desc_en = excluded.desc_en;';
        
        EXECUTE sql_string;
    end loop;

     INSERT INTO public.slots (course_id, weekday, start_time, end_time, room, kind) VALUES
    ('c1', 0, '08:30', '10:30', 'Hall 2', 'lecture'),
    ('c3', 0, '10:30', '12:30', 'Hall 2', 'lecture'),
    ('c3', 0, '12:30', '14:30', 'Lab G1+G2', 'lab'),
    ('c7', 1, '08:30', '09:30', 'Hall 2', 'lecture'),
    ('c12', 1, '09:30', '10:30', 'Hall 2', 'lecture'),
    ('c2', 1, '10:30', '12:30', 'Hall 2', 'lecture'),
    ('c4', 1, '12:30', '14:30', 'Hall 2', 'lecture'),
    ('c8', 2, '08:30', '10:30', 'Hall 2', 'lecture'),
    ('c5', 2, '10:30', '11:30', 'Hall 2', 'lecture'),
    ('c9', 2, '11:30', '12:30', 'Hall 2', 'lecture'),
    ('c5', 2, '12:30', '14:30', 'Lab G3+G4', 'lab'),
    ('c6', 3, '08:30', '10:30', 'Hall 2', 'lecture'),
    ('c1', 3, '10:30', '12:30', 'Lab G1-G3', 'lab'),
    ('c4', 3, '12:30', '14:30', 'Lab G1-G3', 'lab'),
    ('c2', 4, '08:30', '10:30', 'Lab G1-G3', 'lab'),
    ('c11', 4, '10:30', '11:30', 'Hall 4', 'lecture'),
    ('c10', 4, '11:30', '12:30', 'Hall 4', 'lecture'),
    ('c7', 4, '12:30', '14:30', 'Practical G1+G2', 'lab')
    ON CONFLICT (course_id, weekday, start_time, room) DO NOTHING;

    DROP TABLE IF EXISTS temp_data_store;
END $$;