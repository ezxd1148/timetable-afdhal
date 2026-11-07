export type Weekday = 1 | 2 | 3 | 4 | 5; // Monday to Friday
export type Session = "Lecture" | "Tutorial" | "Tutorial/Lab";

export type WeeklyClass = {
  id: string;
  weekday: Weekday;
  startTime: string;
  endTime: string;
  courseCode: string;
  session: Session;
  lecturer: string;
  location: string;
};

export const classSchedule: WeeklyClass[] = [
  {
    id: "tttk1113-mon",
    weekday: 1,
    startTime: "08:00",
    endTime: "10:00",
    courseCode: "TTTK1113",
    session: "Lecture",
    lecturer: "Zarina",
    location: "Online 3",
  },
  {
    id: "tttr1333-mon",
    weekday: 1,
    startTime: "10:00",
    endTime: "12:00",
    courseCode: "TTTR1333",
    session: "Lecture",
    lecturer: "Ruzzakiah",
    location: "Online 1",
  },
  {
    id: "tttk1153-mon",
    weekday: 1,
    startTime: "15:00",
    endTime: "17:00",
    courseCode: "TTTK1153",
    session: "Tutorial/Lab",
    lecturer: "Fahad",
    location: "MP5",
  },
  {
    id: "tttk1113-tue",
    weekday: 2,
    startTime: "08:00",
    endTime: "10:00",
    courseCode: "TTTK1113",
    session: "Lecture",
    lecturer: "Faizan",
    location: "Online 4",
  },
  {
    id: "ttte1113-tue",
    weekday: 2,
    startTime: "10:00",
    endTime: "12:00",
    courseCode: "TTTE1113",
    session: "Lecture",
    lecturer: "Fazlina",
    location: "Online 1",
  },
  {
    id: "tttt1112-tue",
    weekday: 2,
    startTime: "15:00",
    endTime: "17:00",
    courseCode: "TTTT1112",
    session: "Lecture",
    lecturer: "Abdulqaniyu",
    location: "BK8",
  },
  {
    id: "tttr1333-wed",
    weekday: 3,
    startTime: "08:00",
    endTime: "10:00",
    courseCode: "TTTR1333",
    session: "Tutorial",
    lecturer: "Ruzzakiah",
    location: "BK11",
  },
  {
    id: "tttt1113-wed",
    weekday: 3,
    startTime: "10:00",
    endTime: "12:00",
    courseCode: "TTTT1113",
    session: "Tutorial",
    lecturer: "Zaihosnita",
    location: "BK6",
  },
  {
    id: "ttte1113-thu",
    weekday: 4,
    startTime: "10:00",
    endTime: "12:00",
    courseCode: "TTTE1113",
    session: "Tutorial",
    lecturer: "Fazlina",
    location: "BK1",
  },
  {
    id: "tttk1113-thu",
    weekday: 4,
    startTime: "15:00",
    endTime: "17:00",
    courseCode: "TTTK1113",
    session: "Tutorial/Lab",
    lecturer: "Kauthar",
    location: "MP1",
  },
  {
    id: "tttt1113-fri",
    weekday: 5,
    startTime: "10:00",
    endTime: "12:00",
    courseCode: "TTTT1113",
    session: "Lecture",
    lecturer: "Zaihosnita",
    location: "Online 3",
  },
];
