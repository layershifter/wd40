type PerformanceMark = {
  name: string;
  filename: string;
  end: number;
  time: number;
};

function createMark(name: string, filename: string): PerformanceMark {
  const now = performance.now();

  return {
    name,
    filename,
    end: now,
    time: now,
  };
}

export class PerformanceService {
  #marks: PerformanceMark[] = [];

  mark(name: string, filename: string = ''): PerformanceMark {
    const mark = createMark(name, filename);

    this.#marks.push(mark);
    return mark;
  }

  finish(mark: PerformanceMark) {
    mark.end = performance.now();
  }

  async measure<T>(asyncFn: () => Promise<T>, name: string, filename: string) {
    const mark = this.mark(name, filename);
    const result = await asyncFn();

    this.finish(mark);

    return result;
  }

  getMarks() {
    return this.#marks;
  }
}
