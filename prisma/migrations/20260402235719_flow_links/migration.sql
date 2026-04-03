-- AlterTable
ALTER TABLE "AgentRun" ADD COLUMN     "origin_event_id" UUID,
ADD COLUMN     "parent_run_id" UUID;

-- CreateTable
CREATE TABLE "Event" (
    "id" UUID NOT NULL,
    "type" TEXT NOT NULL,
    "task_id" UUID,
    "payload" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Event_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Event_task_id_idx" ON "Event"("task_id");

-- CreateIndex
CREATE INDEX "Event_type_idx" ON "Event"("type");

-- CreateIndex
CREATE INDEX "Event_created_at_idx" ON "Event"("created_at");

-- CreateIndex
CREATE INDEX "AgentRun_parent_run_id_idx" ON "AgentRun"("parent_run_id");

-- CreateIndex
CREATE INDEX "AgentRun_origin_event_id_idx" ON "AgentRun"("origin_event_id");

-- AddForeignKey
ALTER TABLE "Event" ADD CONSTRAINT "Event_task_id_fkey" FOREIGN KEY ("task_id") REFERENCES "Task"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AgentRun" ADD CONSTRAINT "AgentRun_parent_run_id_fkey" FOREIGN KEY ("parent_run_id") REFERENCES "AgentRun"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AgentRun" ADD CONSTRAINT "AgentRun_origin_event_id_fkey" FOREIGN KEY ("origin_event_id") REFERENCES "Event"("id") ON DELETE SET NULL ON UPDATE CASCADE;
