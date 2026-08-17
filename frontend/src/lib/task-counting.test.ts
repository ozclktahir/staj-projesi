import { describe, expect, it } from "vitest";
import { isCountableTask } from "@/lib/task-counting";

describe("isCountableTask", () => {
  it("sayar: kabul edilmiş üst seviye görev", () => {
    expect(
      isCountableTask({ assignment_status: "accepted" }),
    ).toBe(true);
  });

  it("sayar: assignment_status hiç yoksa (migration uygulanmamış şema)", () => {
    expect(isCountableTask({})).toBe(true);
    expect(isCountableTask({ assignment_status: null })).toBe(true);
  });

  it("SAYMAZ: sahiplenme onayı bekleyen görev", () => {
    expect(isCountableTask({ assignment_status: "pending" })).toBe(false);
  });

  it("SAYMAZ: büyük harfli / boşluklu pending değeri", () => {
    expect(isCountableTask({ assignment_status: " PENDING " })).toBe(false);
  });

  it("SAYMAZ: reddedilmiş görev", () => {
    expect(isCountableTask({ assignment_status: "rejected" })).toBe(false);
  });

  it("SAYMAZ: alt görev", () => {
    expect(
      isCountableTask({
        parent_task_id: "parent-1",
        assignment_status: "accepted",
      }),
    ).toBe(false);
  });

  it("SAYMAZ: silinmiş görev", () => {
    expect(
      isCountableTask({
        deleted_at: "2026-08-17T00:00:00Z",
        assignment_status: "accepted",
      }),
    ).toBe(false);
  });

  it("toplam sayaç yalnızca aktif görevleri içerir", () => {
    const rows = [
      { assignment_status: "accepted" },
      { assignment_status: "pending" },
      { assignment_status: "rejected" },
      { assignment_status: "accepted", parent_task_id: "p1" },
      {},
    ];
    expect(rows.filter(isCountableTask)).toHaveLength(2);
  });
});
