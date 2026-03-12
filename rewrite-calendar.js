const fs = require('fs');
let code = fs.readFileSync('c:/Planer/app/components/Calendar.tsx', 'utf-8');

const returnIdx = code.indexOf('    return (\n        <div className="bg-cream-card rounded-xl shadow-sm');
if (returnIdx === -1) {
    console.error('Could not find return statement');
    process.exit(1);
}

const preamble = code.slice(0, returnIdx);

const newReturn = `    return (
        <div className="flex flex-col h-full bg-surface-soft font-nunito text-text-soft overflow-hidden w-full relative">
            {selectedTask && (
                <TaskDetailsModal
                    task={selectedTask}
                    onClose={() => setSelectedTask(null)}
                    onUpdate={handleTaskUpdate}
                    onDelete={handleTaskDelete}
                />
            )}
            {selectedBlock && (
                <WorkBlockModal
                    block={selectedBlock}
                    onClose={() => setSelectedBlock(null)}
                    onUpdate={handleBlockUpdate}
                    onDelete={handleBlockDelete}
                />
            )}

            {/* TOOLBAR */}
            <div className="flex items-center gap-2.5 px-4 sm:px-7 py-3.5 sm:py-4.5 border-b border-line-soft shrink-0 flex-wrap bg-surface-soft z-10 transition-colors">
                <div className="flex items-center gap-2 mr-4 lg:mr-8">
                    <button onClick={prevWeek} className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-bg-soft text-muted-soft flex items-center justify-center hover:bg-peach-bg hover:text-accent-soft transition-colors text-lg sm:text-xl shrink-0 -mt-1 cursor-pointer">‹</button>
                    <h2 className="font-lora text-xl sm:text-2xl font-medium text-text-soft tracking-tight whitespace-nowrap">
                        {format(currentWeekStart, 'MMMM yyyy')}
                    </h2>
                    <button onClick={nextWeek} className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-bg-soft text-muted-soft flex items-center justify-center hover:bg-peach-bg hover:text-accent-soft transition-colors text-lg sm:text-xl shrink-0 -mt-1 cursor-pointer">›</button>
                </div>

                <div className="flex flex-wrap items-center gap-2 lg:gap-3 flex-1">
                    <button onClick={() => setCurrentWeekStart(startOfWeek(new Date(), { weekStartsOn: 1 }))} className="px-3 sm:px-4 py-1.5 rounded-full border-none font-nunito text-xs font-semibold whitespace-nowrap transition-colors bg-bg-soft text-muted-soft hover:bg-peach-bg hover:text-accent-soft hidden sm:block cursor-pointer">Today</button>
                    <button onClick={() => setShowCourses(!showCourses)} className={\`px-3 sm:px-4 py-1.5 rounded-full border-none font-nunito text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer \${showCourses ? 'bg-accent-soft text-white shadow-sm' : 'bg-bg-soft text-muted-soft hover:bg-peach-bg hover:text-accent-soft'}\`}>Courses</button>
                    <button onClick={() => setShowTasks(!showTasks)} className={\`px-3 sm:px-4 py-1.5 rounded-full border-none font-nunito text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer \${showTasks ? 'bg-accent-soft text-white shadow-sm' : 'bg-bg-soft text-muted-soft hover:bg-peach-bg hover:text-accent-soft'}\`}>Tasks</button>

                    <div className="hidden md:flex items-center bg-bg-soft rounded-full overflow-hidden ml-auto border border-transparent">
                        <button onClick={() => setZoomLevel(Math.max(40, zoomLevel - 20))} className="px-3.5 py-1.5 bg-transparent border-none text-xs font-semibold text-muted-soft hover:text-accent-soft transition-colors cursor-pointer">− Zoom</button>
                        <span className="text-[10px] text-line-soft opacity-60">|</span>
                        <button onClick={() => setZoomLevel(Math.min(200, zoomLevel + 20))} className="px-3.5 py-1.5 bg-transparent border-none text-xs font-semibold text-muted-soft hover:text-accent-soft transition-colors cursor-pointer">Zoom +</button>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto mt-2 sm:mt-0 justify-end sm:ml-auto md:ml-2">
                        <button disabled={selectionMode} onClick={async () => {/*...*/}} className={\`px-3 sm:px-4 py-1.5 rounded-full border-none font-nunito text-xs font-semibold whitespace-nowrap transition-colors \${selectionMode ? 'bg-bg-soft text-muted-soft opacity-50 cursor-not-allowed' : 'bg-accent-soft text-white shadow-[0_3px_12px_rgba(160,112,96,0.25)] hover:bg-today-soft cursor-pointer'}\`}>
                            ↻ Update Schedule
                        </button>
                        <button
                            onClick={() => {
                                setSelectionMode(!selectionMode);
                                setSelectedBlockIds(new Set());
                                setSelectedCourseIds(new Set());
                            }}
                            className={\`px-3 sm:px-4 py-1.5 rounded-full font-nunito text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer \${selectionMode ? 'bg-peach-bg text-accent-soft border border-peach' : 'bg-transparent text-accent-soft border border-peach hover:bg-peach-bg'}\`}
                        >
                            ⊞ {selectionMode ? 'Cancel Selection' : 'Select Items'}
                        </button>
                        
                        {selectionMode && (selectedBlockIds.size > 0 || selectedCourseIds.size > 0) ? (
                            <button
                                onClick={handleBulkDelete}
                                className="px-3 sm:px-4 py-1.5 rounded-full border-none font-nunito text-xs font-semibold whitespace-nowrap transition-colors bg-red-500 text-white hover:bg-red-600 cursor-pointer"
                            >
                                Delete ({selectedBlockIds.size + selectedCourseIds.size})
                            </button>
                        ) : (
                            !selectionMode && (
                                <div className="relative">
                                    <button onClick={() => setIsAddingBlock(!isAddingBlock)} className="px-3 sm:px-4 py-1.5 rounded-full border-none font-nunito text-xs font-semibold whitespace-nowrap transition-colors bg-bg-soft text-muted-soft hover:bg-peach-bg hover:text-accent-soft w-full cursor-pointer">
                                        ＋ Add Block
                                    </button>
                                    {isAddingBlock && (
                                        <div className="absolute right-0 top-full mt-2 w-64 bg-card-soft border border-line-soft rounded-xl shadow-md z-[60] max-h-64 overflow-y-auto p-1">
                                            <div className="text-[10px] font-bold text-muted-soft uppercase tracking-wider mb-1 pl-2 pt-1">Select a Task</div>
                                            {tasks.filter(t => t.status !== 'done').length === 0 ? (
                                                <div className="p-3 text-xs text-muted-soft text-center">No active tasks</div>
                                            ) : (
                                                tasks.filter(t => t.status !== 'done').map(task => (
                                                    <button
                                                        key={task.id}
                                                        onClick={async () => {
                                                            setIsAddingBlock(false);
                                                            try {
                                                                const defaultDate = new Date();
                                                                defaultDate.setDate(defaultDate.getDate() + 1);
                                                                defaultDate.setHours(9, 0, 0, 0);
                                                                const newTaskRes = await fetch('/api/blocks', {
                                                                    method: 'POST',
                                                                    headers: { 'Content-Type': 'application/json' },
                                                                    body: JSON.stringify({ taskId: task.id, startAt: defaultDate.toISOString(), durationMinutes: 60 })
                                                                });
                                                                if (!newTaskRes.ok) throw new Error('Failed');
                                                                const createdBlock = await newTaskRes.json();
                                                                setCurrentWeekStart(startOfWeek(defaultDate, { weekStartsOn: 1 }));
                                                                setNewlyAddedBlockId(createdBlock.id);
                                                                setTimeout(() => setNewlyAddedBlockId(null), 3000);
                                                                router.refresh();
                                                            } catch (error) { alert('Failed to add work block'); }
                                                        }}
                                                        className="w-full text-left px-3 py-2 text-xs hover:bg-bg-soft text-text-soft rounded-lg transition-colors truncate mb-0.5 cursor-pointer"
                                                    >
                                                        {task.title}
                                                    </button>
                                                ))
                                            )}
                                        </div>
                                    )}
                                </div>
                            )
                        )}

                        {!selectionMode && (
                            <button onClick={async () => {
                                if (confirm('Clear ALL items from the calendar?\\n\\nThis will remove the schedule but keep Courses & Tasks.')) {
                                    await fetch('/api/plan', { method: 'DELETE' });
                                    window.location.reload();
                                }
                            }} className="px-3 sm:px-4 py-1.5 rounded-full font-nunito text-xs font-semibold whitespace-nowrap transition-colors bg-transparent text-[#c06060] border border-[#e0b8b8] hover:bg-[#fdf0f0] cursor-pointer">
                                ✕ Clear All
                            </button>
                        )}
                    </div>
                </div>
            </div>

            {/* Drop Zones */}
            {isDragging && (
                <>
                    <div className="absolute top-0 left-0 w-12 h-full bg-sky-bg/80 z-20 flex items-center justify-center border-r-2 border-sky transition-all" onDragOver={(e) => handleEdgeDragOver(e, -1)} onDragLeave={handleEdgeDragLeave} onDrop={(e) => handleWeekDrop(e, -1)}></div>
                    <div className="absolute top-0 right-0 w-12 h-full bg-sky-bg/80 z-20 flex items-center justify-center border-l-2 border-sky transition-all" onDragOver={(e) => handleEdgeDragOver(e, 1)} onDragLeave={handleEdgeDragLeave} onDrop={(e) => handleWeekDrop(e, 1)}></div>
                </>
            )}

            {/* CALENDAR AREA */}
            <div className="flex-1 overflow-auto px-4 sm:px-7 pb-5 format-scroll relative">
                
                {/* WEEK HEADER */}
                <div className="grid sticky top-0 bg-surface-soft z-[5] pt-3.5 pb-2 border-b border-line-soft gap-1" style={{ gridTemplateColumns: \`54px \${gridTemplateColumns}\` }}>
                    <div className=""></div>
                    {days.map((day, i) => {
                        const isCurrent = isSameDay(day, new Date());
                        return (
                            <div key={day.toISOString()} className="text-center py-1.5 px-1">
                                <div className="text-[0.68rem] font-semibold uppercase tracking-[0.08em] text-muted-soft">{format(day, 'EEE')}</div>
                                <div className={\`mt-0.5 w-9 h-9 mx-auto flex items-center justify-center rounded-full text-xl font-medium transition-colors \${isCurrent ? 'bg-today-soft text-white font-bold shadow-[0_3px_12px_rgba(196,120,106,0.30)]' : 'text-text-soft'}\`}>
                                    {format(day, 'd')}
                                </div>
                            </div>
                        )
                    })}
                </div>

                {/* TIME GRID */}
                <div className="grid gap-1 relative mt-[1px]" style={{ gridTemplateColumns: \`54px \${gridTemplateColumns}\`, height: \`\${gridHeight}px\` }}>
                    
                    {/* Time labels column */}
                    <div className="flex flex-col relative z-[2] border-r border-transparent" style={{ height: \`\${gridHeight}px\` }}>
                        {Array.from({ length: totalHours + 1 }).map((_, i) => {
                            const h = minHour + i;
                            return (
                                <div key={\`time-\${h}\`} className="absolute w-full pr-2.5 text-[0.65rem] text-muted-soft text-right font-semibold leading-none flex justify-end -translate-y-[6px]" style={{ top: \`\${i * PIXELS_PER_HOUR}px\` }}>
                                    {h === 0 ? '12 AM' : h < 12 ? \`\${h} AM\` : h === 12 ? '12 PM' : h === 24 ? '12 AM' : \`\${h > 24 ? h - 24 : h - 12} PM\`}
                                </div>
                            );
                        })}
                    </div>

                    {/* Horizontal lines */}
                    <div className="absolute inset-0 left-[54px] pointer-events-none flex flex-col z-[1]">
                        {Array.from({ length: totalHours }).map((_, i) => (
                            <div key={\`line-\${i}\`} className="w-full flex-shrink-0 border-t border-line-soft transition-colors" style={{ height: \`\${PIXELS_PER_HOUR}px\` }}></div>
                        ))}
                    </div>

                    {/* Now Line */}
                    {(() => {
                        const currentTotalMinutes = currentTime.getHours() * 60 + currentTime.getMinutes();
                        const minTotalMinutes = minHour * 60;
                        const maxTotalMinutes = maxHour * 60;
                        if (currentTotalMinutes >= minTotalMinutes && currentTotalMinutes <= maxTotalMinutes) {
                            return (
                                <div className="absolute left-[54px] right-0 h-[2px] bg-today-soft rounded-sm z-[4] pointer-events-none" style={{ top: \`\${(currentTotalMinutes - minTotalMinutes) * PIXELS_PER_MINUTE}px\` }}>
                                    <div className="absolute -left-1.5 -top-[4px] w-2.5 h-2.5 rounded-full bg-today-soft"></div>
                                </div>
                            );
                        }
                        return null;
                    })()}

                    {/* Columns */}
                    {days.map(day => (
                        <div
                            key={day.toISOString()}
                            className="relative border-r border-transparent flex flex-col group z-[2]"
                            style={{ height: \`\${gridHeight}px\` }}
                            onDragOver={(e) => {
                                e.preventDefault();
                                e.dataTransfer.dropEffect = e.altKey || e.ctrlKey ? 'copy' : 'move';
                                const dayIso = day.toISOString();
                                if (dragOverDay !== dayIso) setDragOverDay(dayIso);
                                const bounds = e.currentTarget.getBoundingClientRect();
                                const y = e.clientY - bounds.top;
                                const snappedMinutes = Math.round(y / (15 * PIXELS_PER_MINUTE)) * 15;
                                const previewY = snappedMinutes * PIXELS_PER_MINUTE;
                                if (dragPreviewY !== previewY) setDragPreviewY(previewY);
                            }}
                            onDrop={async (e) => {
                                e.preventDefault();
                                setIsDragging(false);
                                setDragOverDay(null);
                                setDraggedBlock(null);
                                setDragPreviewY(null);
                                const bounds = e.currentTarget.getBoundingClientRect();
                                const y = e.clientY - bounds.top;
                                const snappedMinutes = Math.round(y / (15 * PIXELS_PER_MINUTE)) * 15;
                                const totalMinutes = minHour * 60 + snappedMinutes;
                                const hour = Math.floor(totalMinutes / 60);
                                const minute = Math.max(0, Math.min(59, totalMinutes % 60));
                                const blockId = e.dataTransfer.getData('blockId');
                                const originalStartStr = e.dataTransfer.getData('originalStart');
                                if (!blockId || !originalStartStr) return;
                                const newStart = new Date(day);
                                newStart.setHours(hour, minute, 0, 0);
                                await finalizeDrop(blockId, newStart, e.altKey || e.ctrlKey);
                            }}
                        >
                            {isDragging && dragOverDay === day.toISOString() && (
                                <div className="absolute inset-0 bg-sky-bg/40 opacity-50 z-[1] rounded-lg"></div>
                            )}

                            {isDragging && dragOverDay === day.toISOString() && draggedBlock && dragPreviewY !== null && (
                                <div className="absolute left-1 right-1 rounded-[12px] p-1.5 px-2 bg-sky-bg border-l-[3px] border-sky border-dashed z-[50] pointer-events-none flex flex-col overflow-hidden shadow-sm"
                                     style={{
                                         top: \`\${dragPreviewY}px\`,
                                         height: \`\${Math.max(28, draggedBlock.durationMinutes * PIXELS_PER_MINUTE)}px\`
                                     }}>
                                     <div className="text-[10px] text-[#2a5070] font-bold opacity-70 mb-0.5 tracking-tight">
                                        {format(setMinutes(setHours(new Date(), Math.floor((dragPreviewY / PIXELS_PER_MINUTE) + minHour)), Math.round(dragPreviewY / PIXELS_PER_MINUTE) % 60), 'h:mm a')}
                                     </div>
                                     <div className="text-xs text-[#2a5070] font-semibold line-clamp-1">{draggedBlock.task.title}</div>
                                </div>
                            )}

                            {(() => {
                                type CalendarItem =
                                    | { type: 'period'; data: ClassPeriod; time: Date; startMins: number; endMins: number }
                                    | { type: 'block'; data: WorkBlock; time: Date; startMins: number; endMins: number }
                                    | { type: 'task'; data: Task; time: Date; startMins: number; endMins: number };
                                
                                const items: CalendarItem[] = [];

                                if (showCourses) {
                                    const periods = getPeriodsForDay(day);
                                    items.push(...periods.map(p => {
                                        const [h, m] = p.startTime.split(':');
                                        const [eh, em] = p.endTime.split(':');
                                        const startMins = parseInt(h) * 60 + parseInt(m);
                                        const durationMins = (parseInt(eh) * 60 + parseInt(em)) - startMins;
                                        const height = Math.max(28, durationMins * PIXELS_PER_MINUTE);
                                        const d = new Date(day);
                                        d.setHours(parseInt(h), parseInt(m), 0, 0);
                                        return { type: 'period' as const, data: p, time: d, startMins, endMins: startMins + (height / PIXELS_PER_MINUTE) };
                                    }));
                                }

                                if (showTasks) {
                                    workBlocks.filter(wb => isSameDay(parseISO(wb.startAt), day)).forEach(wb => {
                                        const start = parseISO(wb.startAt);
                                        const startMins = start.getHours() * 60 + start.getMinutes();
                                        const height = Math.max(28, wb.durationMinutes * PIXELS_PER_MINUTE);
                                        items.push({ type: 'block' as const, data: wb, time: start, startMins, endMins: startMins + (height / PIXELS_PER_MINUTE) });
                                    });

                                    tasks.filter(t => t.dueAt && isSameDay(parseISO(t.dueAt), day)).forEach(t => {
                                        const time = parseISO(t.dueAt!);
                                        const startMins = time.getHours() * 60 + time.getMinutes() - (14 / PIXELS_PER_MINUTE);
                                        items.push({ type: 'task' as const, data: t, time, startMins, endMins: startMins + (28 / PIXELS_PER_MINUTE) });
                                    });
                                }

                                items.sort((a, b) => a.startMins - b.startMins || b.endMins - a.endMins);
                                const clusters: CalendarItem[][] = [];
                                let currentCluster: CalendarItem[] = [];
                                let clusterEnd = 0;

                                for (const item of items) {
                                    if (currentCluster.length === 0) { currentCluster.push(item); clusterEnd = item.endMins; }
                                    else if (item.startMins < clusterEnd) { currentCluster.push(item); clusterEnd = Math.max(clusterEnd, item.endMins); }
                                    else { clusters.push(currentCluster); currentCluster = [item]; clusterEnd = item.endMins; }
                                }
                                if (currentCluster.length > 0) clusters.push(currentCluster);

                                const itemStyles = new Map<CalendarItem, { left: string, width: string, zIndexOffset: number }>();

                                for (const cluster of clusters) {
                                    const columns: CalendarItem[][] = [];
                                    for (const item of cluster) {
                                        let placed = false;
                                        for (const col of columns) {
                                            if (col[col.length - 1].endMins <= item.startMins) {
                                                col.push(item); placed = true; break;
                                            }
                                        }
                                        if (!placed) columns.push([item]);
                                    }
                                    const numCols = columns.length;
                                    columns.forEach((col, colIndex) => {
                                        col.forEach(item => {
                                            itemStyles.set(item, {
                                                left: \`calc(\${(colIndex / numCols) * 100}% + 4px)\`,
                                                width: \`calc(\${100 / numCols}% - 8px)\`,
                                                zIndexOffset: colIndex
                                            });
                                        });
                                    });
                                }

                                const colorClasses = [
                                    { bg: 'var(--color-lav-bg)', color: '#5a4878', border: 'var(--color-lavender)' },
                                    { bg: 'var(--color-sand-bg)', color: '#6a5030', border: 'var(--color-sand)' },
                                    { bg: 'var(--color-sage-bg)', color: '#3a5a38', border: 'var(--color-sage)' },
                                    { bg: 'var(--color-sky-bg)', color: '#2a5070', border: 'var(--color-sky)' },
                                    { bg: 'var(--color-rose-bg)', color: '#7a3850', border: 'var(--color-rose)' },
                                    { bg: 'var(--color-peach-bg)', color: '#7a3820', border: 'var(--color-peach)' }
                                ];

                                const getHashColor = (str: string) => {
                                    let h = 0; for(let i=0; i<str.length; i++) h = Math.imul(31, h) + str.charCodeAt(i) | 0;
                                    return colorClasses[Math.abs(h) % colorClasses.length];
                                };

                                return items.map((item, index) => {
                                    const itemTotalMinutes = item.time.getHours() * 60 + item.time.getMinutes();
                                    const itemY = (itemTotalMinutes - (minHour * 60)) * PIXELS_PER_MINUTE;
                                    if (itemTotalMinutes < minHour * 60 || itemTotalMinutes >= maxHour * 60) {
                                        if (!(item.type === 'task' && itemTotalMinutes === maxHour * 60)) {}
                                    }

                                    if (item.type === 'period') {
                                        const period = item.data;
                                        const isSelected = selectedCourseIds.has(period.course.id);
                                        const formatTime = (t: string) => {
                                            const [h, m] = t.split(':');
                                            const d = new Date(); d.setHours(parseInt(h), parseInt(m));
                                            return format(d, 'h:mm a');
                                        };
                                        const [eh, em] = period.endTime.split(':');
                                        const [sh, sm] = period.startTime.split(':');
                                        const durationMins = (parseInt(eh)*60 + parseInt(em)) - (parseInt(sh)*60 + parseInt(sm));
                                        let pxHeight = Math.max(28, durationMins * PIXELS_PER_MINUTE);

                                        const styleObj = period.course.color ? {
                                            bg: period.course.color + '20',
                                            color: '#524840',
                                            border: period.course.color
                                        } : getHashColor(period.id);

                                        const isPast = (() => {
                                            const endDate = new Date(day); endDate.setHours(parseInt(eh), parseInt(em), 0, 0);
                                            return currentTime > endDate;
                                        })();

                                        return (
                                            <div
                                                key={\`period-\${period.id}-\${index}\`}
                                                className={\`absolute px-[9px] py-[7px] rounded-[12px] cursor-pointer text-[10px] sm:text-[11px] transition-transform duration-150 overflow-hidden shadow-none \${selectionMode ? 'hover:scale-100 ring-1 ring-red-300' : 'hover:-translate-y-px hover:shadow-[0_6px_20px_rgba(120,90,70,0.14)] z-[2] hover:z-[10]'} \${isSelected ? 'ring-2 ring-red-500 opacity-100' : ''} \${isPast ? 'opacity-55' : ''}\`}
                                                style={{
                                                    top: \`\${itemY}px\`, height: \`\${pxHeight}px\`,
                                                    left: itemStyles.get(item)?.left || '4px', width: itemStyles.get(item)?.width || 'calc(100% - 8px)',
                                                    backgroundColor: styleObj.bg, borderLeft: \`3px solid \${styleObj.border}\`, color: styleObj.color,
                                                    opacity: selectionMode && !isSelected && selectedCourseIds.size > 0 ? 0.4 : undefined
                                                }}
                                                onClick={() => { if(selectionMode) toggleSelection(period.course.id, 'course'); else router.push(\`/courses?edit=\${period.course.id}\`); }}
                                            >
                                                <div className="flex justify-between items-start">
                                                    <div className="font-semibold opacity-70 mb-0.5 text-[9px] sm:text-[10px] tracking-tight">{formatTime(period.startTime)}</div>
                                                    {selectionMode && (
                                                        <div className={\`w-3.5 h-3.5 rounded-full border flex items-center justify-center text-[9px] \${isSelected ? 'bg-red-500 border-red-500 text-white' : 'border-red-300 bg-white/50'}\`}>{isSelected && '✓'}</div>
                                                    )}
                                                </div>
                                                <div className={\`font-semibold text-[11.5px] leading-[1.3] line-clamp-2 \${isPast ? 'line-through' : ''}\`}>{period.course.code ? \`\${period.course.code} - \${period.course.name}\` : period.course.name}</div>
                                            </div>
                                        );
                                    } else if (item.type === 'block') {
                                        const wb = item.data;
                                        const styleObj = getHashColor(wb.task.id);
                                        const isSelected = selectedBlockIds.has(wb.id);
                                        const displayDuration = resizingBlockId === wb.id && resizingDuration !== null ? resizingDuration : wb.durationMinutes;
                                        let height = Math.max(28, displayDuration * PIXELS_PER_MINUTE);
                                        const sameBlocks = workBlocks.filter(b => b.task.id === wb.task.id).sort((a,b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime());
                                        const isMulti = sameBlocks.length > 1;
                                        const partNum = isMulti ? sameBlocks.findIndex(b => b.id === wb.id) + 1 : 0;
                                        const isPast = currentTime > addMinutes(parseISO(wb.startAt), wb.durationMinutes);
                                        const isDone = wb.task.status === 'done' || isPast;

                                        return (
                                            <div
                                                key={\`block-\${wb.id}-\${index}\`}
                                                draggable={!selectionMode && !resizingBlockId}
                                                onDragStart={(e) => handleDragStart(e, wb)}
                                                onDragEnd={handleDragEnd}
                                                className={\`absolute px-[9px] py-[7px] rounded-[12px] text-[10px] sm:text-[11px] transition-transform duration-150 overflow-hidden shadow-none \${selectionMode ? 'cursor-pointer hover:scale-100 ring-1 ring-blue-300' : 'cursor-grab active:cursor-grabbing hover:-translate-y-px hover:shadow-[0_6px_20px_rgba(120,90,70,0.14)] z-[2] hover:z-[10]'} \${isSelected ? 'ring-2 ring-blue-500 opacity-100' : ''} \${isDone ? 'opacity-55' : ''}\`}
                                                style={{
                                                    top: \`\${itemY}px\`, height: \`\${height}px\`,
                                                    left: itemStyles.get(item)?.left || '4px', width: itemStyles.get(item)?.width || 'calc(100% - 8px)',
                                                    backgroundColor: styleObj.bg, borderLeft: \`3px solid \${styleObj.border}\`, color: styleObj.color,
                                                    opacity: selectionMode && !isSelected ? 0.4 : undefined
                                                }}
                                                onClick={(e) => { e.stopPropagation(); if(selectionMode) toggleSelection(wb.id, 'block'); else setSelectedBlock(wb); }}
                                            >
                                                {isMulti && <div className="absolute top-1 right-[5px] bg-white/60 text-[#7a3850] text-[9.5px] font-bold px-[6px] py-[2px] rounded-[10px] z-10">{partNum}/{sameBlocks.length}</div>}
                                                {selectionMode && (
                                                    <div className={\`absolute top-1.5 right-1.5 w-3.5 h-3.5 rounded-full border flex items-center justify-center text-[9px] z-10 \${isSelected ? 'bg-blue-500 border-blue-500 text-white' : 'border-blue-300 bg-white/50'}\`}>{isSelected && '✓'}</div>
                                                )}
                                                <div className="font-semibold opacity-70 mb-[2px] text-[10.5px] tracking-tight pointer-events-none">{format(parseISO(wb.startAt), 'h:mm a')}</div>
                                                {wb.task.course?.code && <div className="text-[9.5px] tracking-wide opacity-60 mb-[1px] pointer-events-none leading-none">{wb.task.course.code}</div>}
                                                <div className={\`font-semibold leading-[1.3] text-[11.5px] line-clamp-3 pointer-events-none \${isDone ? 'line-through' : ''}\`}>{wb.task.title}</div>
                                                {height >= 45 && <div className="text-[9.5px] opacity-60 mt-[3px] pointer-events-none">{displayDuration >= 60 ? \`\${Math.floor(displayDuration/60)}h \${displayDuration%60 > 0 ? displayDuration%60+'m' : ''}\` : displayDuration+'m'}</div>}
                                                
                                                {!selectionMode && (
                                                    <div className="absolute bottom-0 left-0 right-0 h-3 cursor-ns-resize hover:bg-black/10 rounded-b transition-colors z-20" onPointerDown={(e) => handleResizeStart(e, wb)} />
                                                )}
                                            </div>
                                        );
                                    } else {
                                        const t = item.data;
                                        const isPast = currentTime > parseISO(t.dueAt!);
                                        const styleObj = getHashColor(t.id);
                                        return (
                                            <div
                                                key={\`task-\${t.id}-\${index}\`}
                                                className={\`absolute px-[9px] py-[3px] rounded-[12px] border-l-[3px] text-[10px] shadow-sm cursor-pointer flex items-center gap-1.5 overflow-hidden \${isPast || t.status === 'done' ? 'opacity-60 bg-bg-soft text-muted-soft border-line-soft' : 'hover:-translate-y-px hover:shadow-[0_4px_12px_rgba(120,90,70,0.1)] z-[3] hover:z-[10]'}\`}
                                                style={{
                                                    top: \`\${itemY-14}px\`, height: '28px',
                                                    left: itemStyles.get(item)?.left || '4px', width: itemStyles.get(item)?.width || 'calc(100% - 8px)',
                                                    backgroundColor: (isPast || t.status === 'done') ? undefined : styleObj.bg,
                                                    borderLeftColor: (isPast || t.status === 'done') ? undefined : styleObj.border,
                                                    color: (isPast || t.status === 'done') ? undefined : styleObj.color
                                                }}
                                                onClick={() => !selectionMode && setSelectedTask(t)}
                                            >
                                                <div className="font-bold opacity-60 flex-shrink-0 text-[9px] uppercase tracking-wide">Due</div>
                                                <div className={\`truncate font-semibold \${isPast || t.status === 'done' ? 'line-through' : ''}\`}>{format(parseISO(t.dueAt!), 'h:mm')} - {t.title}</div>
                                            </div>
                                        );
                                    }
                                });
                            })()}
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}`;

const newCode = preamble + newReturn;

fs.writeFileSync('c:/Planer/app/components/Calendar.tsx', newCode, 'utf-8');
console.log('Successfully written via temp script');
