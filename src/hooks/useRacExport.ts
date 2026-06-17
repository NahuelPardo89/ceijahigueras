import * as XLSX from 'xlsx';
import type { StudentRecord } from './useStudents';
import type { Subject } from './useSubjects';
import type { Grade } from './useGrades';

export function exportRac(
  studentsBySheet: {
    name: string;
    students: StudentRecord[];
    subjects: Subject[];
    gradesByStudent: Map<string, Grade[]>;
  }[],
  year: number,
) {
  const wb = XLSX.utils.book_new();

  for (const { name, students, subjects, gradesByStudent } of studentsBySheet) {
    if (students.length === 0) continue;

    const sortedSubjects = [...subjects].sort((a, b) => a.modulo - b.modulo || a.order - b.order);

    const headers = ['Apellido', 'Nombres', 'DNI', ...sortedSubjects.map(s => s.nombre)];

    const rows = students.map(student => {
      const grades = gradesByStudent.get(student.id) ?? [];
      return [
        student.apellido,
        student.nombre,
        student.dni,
        ...sortedSubjects.map(subject => {
          const subjectGrades = grades
            .filter(g => g.subjectId === subject.id && g.nota)
            .map(g => g.nota);
          return subjectGrades.length > 0 ? subjectGrades.join(', ') : '';
        }),
      ];
    });

    const wsData = [headers, ...rows];
    const ws = XLSX.utils.aoa_to_sheet(wsData);

    const colWidths = headers.map((_, i) => {
      const max = wsData.map(row => String(row[i] ?? '').length);
      return { wch: Math.min(Math.max(...max) + 2, 40) };
    });
    ws['!cols'] = colWidths;

    XLSX.utils.book_append_sheet(wb, ws, name.slice(0, 31));
  }

  if (wb.SheetNames.length > 0) {
    XLSX.writeFile(wb, `RAC ${year} Las Higueras.xlsx`);
  }
}
