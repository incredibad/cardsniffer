import asyncio
import glob
import json
import os

from fastapi import APIRouter, Depends, Query
from fastapi.responses import StreamingResponse

from auth import require_admin
from log_buffer import snapshot, lines_from

router = APIRouter(prefix="/logs", tags=["logs"], dependencies=[Depends(require_admin)])

_LOG_FILE = "/data/cardsniffer.log"


@router.get("/history")
async def log_history(limit: int = Query(2000)):
    lines: list[str] = []
    try:
        all_files = glob.glob(_LOG_FILE + "*")
        backups = sorted([f for f in all_files if f != _LOG_FILE])
        ordered = backups + ([_LOG_FILE] if os.path.exists(_LOG_FILE) else [])
        for path in ordered:
            with open(path, "r", encoding="utf-8", errors="replace") as f:
                for line in f:
                    lines.append(line.rstrip("\n"))
    except Exception:
        pass
    return {"lines": lines[-limit:]}


@router.get("/stream")
async def stream_logs():
    async def generate():
        _, pos = snapshot()
        while True:
            await asyncio.sleep(0.5)
            new_lines, pos = lines_from(pos)
            for line in new_lines:
                yield f"data: {json.dumps(line)}\n\n"

    return StreamingResponse(
        generate(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )
