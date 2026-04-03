-- CreateEnum
CREATE TYPE "AgentRunStatus" AS ENUM ('running', 'completed', 'failed');

-- CreateTable
CREATE TABLE "AgentRun" (
    "id" UUID NOT NULL,
    "agent_type" TEXT NOT NULL,
    "task_id" UUID,
    "event_type" TEXT,
    "status" "AgentRunStatus" NOT NULL,
    "started_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finished_at" TIMESTAMP(3),
    "metadata" JSONB,

    CONSTRAINT "AgentRun_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AgentRun_agent_type_idx" ON "AgentRun"("agent_type");

-- CreateIndex
CREATE INDEX "AgentRun_status_idx" ON "AgentRun"("status");

-- CreateIndex
CREATE INDEX "AgentRun_event_type_idx" ON "AgentRun"("event_type");

-- CreateIndex
CREATE INDEX "AgentRun_task_id_idx" ON "AgentRun"("task_id");

-- CreateIndex
CREATE INDEX "AgentRun_started_at_idx" ON "AgentRun"("started_at");

-- AddForeignKey
ALTER TABLE "AgentRun" ADD CONSTRAINT "AgentRun_task_id_fkey" FOREIGN KEY ("task_id") REFERENCES "Task"("id") ON DELETE SET NULL ON UPDATE CASCADE;
