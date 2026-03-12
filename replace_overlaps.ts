import fs from 'fs';
import path from 'path';

const file = 'c:/Planer/app/components/Calendar.tsx';
let content = fs.readFileSync(file, 'utf8');

const target1 = `                                        type CalendarItem =
                                            | { type: 'period'; data: ClassPeriod; time: Date }
                                            | { type: 'block'; data: WorkBlock; time: Date }
                                            | { type: 'task'; data: Task; time: Date };

                                        const items: CalendarItem[] = [];

                                        if (showCourses) {
                                            const periods = getPeriodsForDay(day);
                                            items.push(...periods.map(p => {
                                                const [h, m] = p.startTime.split(':');
                                                const d = new Date(day);
                                                d.setHours(parseInt(h), parseInt(m), 0, 0);
                                                return { type: 'period' as const, data: p, time: d };
                                            }));
                                        }

                                        if (showTasks) {
                                            workBlocks
                                                .filter(wb => isSameDay(parseISO(wb.startAt), day))
                                                .forEach(wb => {
                                                    items.push({ type: 'block' as const, data: wb, time: parseISO(wb.startAt) });
                                                });

                                            tasks
                                                .filter(t => t.dueAt && isSameDay(parseISO(t.dueAt), day))
                                                .forEach(t => {
                                                    items.push({ type: 'task' as const, data: t, time: parseISO(t.dueAt!) });
                                                });
                                        }

                                        return items.map((item, index) => {`;

const replace1 = `                                        type CalendarItem =
                                            | { type: 'period'; data: ClassPeriod; time: Date; startMins: number; endMins: number }
                                            | { type: 'block'; data: WorkBlock; time: Date; startMins: number; endMins: number }
                                            | { type: 'task'; data: Task; time: Date; startMins: number; endMins: number };

                                        const items: CalendarItem[] = [];

                                        if (showCourses) {
                                            const periods = getPeriodsForDay(day);
                                            items.push(...periods.map(p => {
                                                const [h, m] = p.startTime.split(':');
                                                const [eh, em] = p.endTime.split(':');
                                                const d = new Date(day);
                                                d.setHours(parseInt(h), parseInt(m), 0, 0);
                                                const startMins = parseInt(h) * 60 + parseInt(m);
                                                const durationMins = (parseInt(eh) * 60 + parseInt(em)) - startMins;
                                                const height = Math.max(30, durationMins * PIXELS_PER_MINUTE);
                                                const actualEndMins = startMins + (height / PIXELS_PER_MINUTE);
                                                return { type: 'period' as const, data: p, time: d, startMins, endMins: actualEndMins };
                                            }));
                                        }

                                        if (showTasks) {
                                            workBlocks
                                                .filter(wb => isSameDay(parseISO(wb.startAt), day))
                                                .forEach(wb => {
                                                    const start = parseISO(wb.startAt);
                                                    const startMins = start.getHours() * 60 + start.getMinutes();
                                                    const height = Math.max(20, wb.durationMinutes * PIXELS_PER_MINUTE);
                                                    const endMins = startMins + (height / PIXELS_PER_MINUTE);
                                                    items.push({ type: 'block' as const, data: wb, time: start, startMins, endMins });
                                                });

                                            tasks
                                                .filter(t => t.dueAt && isSameDay(parseISO(t.dueAt), day))
                                                .forEach(t => {
                                                    const time = parseISO(t.dueAt!);
                                                    const startMins = time.getHours() * 60 + time.getMinutes() - (14 / PIXELS_PER_MINUTE);
                                                    const endMins = startMins + (28 / PIXELS_PER_MINUTE);
                                                    items.push({ type: 'task' as const, data: t, time, startMins, endMins });
                                                });
                                        }

                                        items.sort((a, b) => a.startMins - b.startMins || b.endMins - a.endMins);
                                        const clusters: CalendarItem[][] = [];
                                        let currentCluster: CalendarItem[] = [];
                                        let clusterEnd = 0;

                                        for (const item of items) {
                                            if (currentCluster.length === 0) {
                                                currentCluster.push(item);
                                                clusterEnd = item.endMins;
                                            } else if (item.startMins < clusterEnd) {
                                                currentCluster.push(item);
                                                clusterEnd = Math.max(clusterEnd, item.endMins);
                                            } else {
                                                clusters.push(currentCluster);
                                                currentCluster = [item];
                                                clusterEnd = item.endMins;
                                            }
                                        }
                                        if (currentCluster.length > 0) {
                                            clusters.push(currentCluster);
                                        }

                                        const itemStyles = new Map<CalendarItem, { left: string, width: string, zIndexOffset: number }>();
                                        
                                        for (const cluster of clusters) {
                                            const columns: CalendarItem[][] = [];
                                            for (const item of cluster) {
                                                let placed = false;
                                                for (const col of columns) {
                                                    const lastInCol = col[col.length - 1];
                                                    if (lastInCol.endMins <= item.startMins) {
                                                        col.push(item);
                                                        placed = true;
                                                        break;
                                                    }
                                                }
                                                if (!placed) {
                                                    columns.push([item]);
                                                }
                                            }
                                            const numCols = columns.length;
                                            columns.forEach((col, colIndex) => {
                                                col.forEach(item => {
                                                    const left = \`calc(\${(colIndex / numCols) * 100}% + 4px)\`;
                                                    const width = \`calc(\${100 / numCols}% - 8px)\`;
                                                    itemStyles.set(item, { left, width, zIndexOffset: colIndex });
                                                });
                                            });
                                        }

                                        return items.map((item, index) => {`;

const targetPeriod = `                                                    <div
                                                        key={\`period-\${period.id}-\${index}\`}
                                                        className={\`absolute left-1 right-1 p-2 rounded-md text-[10px] sm:text-xs shadow-sm transition-all overflow-hidden border-l-4 \${selectionMode
                                                            ? 'cursor-pointer border-r border-b border-t border-dashed border-red-300 hover:bg-red-50'
                                                            : 'cursor-pointer hover:shadow-md'
                                                            } \${isSelected ? 'ring-2 ring-red-600 ring-offset-1 opacity-100 bg-red-100' : ''} \${isActive ? 'ring-2 ring-yellow-400 ring-offset-1 animate-pulse shadow-lg' : ''} \${isPast ? 'opacity-60 grayscale' : ''}\`}
                                                        style={{
                                                            top: \`\${itemY}px\`,
                                                            height: \`\${height}px\`,
                                                            backgroundColor: selectionMode ? undefined : (\`\${period.course.color}40\` || '#EBF5FF'),
                                                            borderLeftColor: period.course.color || '#3B82F6',
                                                            color: '#1f2937',
                                                            zIndex: 10,
                                                            opacity: selectionMode && !isSelected && selectedCourseIds.size > 0 ? 0.5 : undefined
                                                        }}`;
const replacePeriod = `                                                    <div
                                                        key={\`period-\${period.id}-\${index}\`}
                                                        className={\`absolute p-2 rounded-md text-[10px] sm:text-xs shadow-sm transition-all overflow-hidden border-l-4 \${selectionMode
                                                            ? 'cursor-pointer border-r border-b border-t border-dashed border-red-300 hover:bg-red-50'
                                                            : 'cursor-pointer hover:shadow-md'
                                                            } \${isSelected ? 'ring-2 ring-red-600 ring-offset-1 opacity-100 bg-red-100' : ''} \${isActive ? 'ring-2 ring-yellow-400 ring-offset-1 animate-pulse shadow-lg' : ''} \${isPast ? 'opacity-60 grayscale' : ''}\`}
                                                        style={{
                                                            top: \`\${itemY}px\`,
                                                            left: itemStyles.get(item)?.left || '4px',
                                                            width: itemStyles.get(item)?.width || 'calc(100% - 8px)',
                                                            height: \`\${height}px\`,
                                                            backgroundColor: selectionMode ? undefined : (\`\${period.course.color}40\` || '#EBF5FF'),
                                                            borderLeftColor: period.course.color || '#3B82F6',
                                                            color: '#1f2937',
                                                            zIndex: 10 + (itemStyles.get(item)?.zIndexOffset || 0),
                                                            opacity: selectionMode && !isSelected && selectedCourseIds.size > 0 ? 0.5 : undefined
                                                        }}`;

const targetBlock = `                                                    <div
                                                        key={\`block-\${wb.id}-\${index}\`}
                                                        draggable={!selectionMode && !resizingBlockId}
                                                        onDragStart={(e) => handleDragStart(e, wb)}
                                                        onDragEnd={handleDragEnd}
                                                        className={\`absolute left-1 right-1 group p-2 rounded-md text-[10px] sm:text-xs text-white shadow-sm transition-transform duration-200 overflow-hidden \${selectionMode
                                                            ? 'cursor-pointer hover:opacity-100'
                                                            : 'cursor-grab active:cursor-grabbing hover:shadow-md'
                                                            } \${isSelected ? 'ring-2 ring-blue-500 ring-offset-1 opacity-100' : 'opacity-95'} 
                                                        \${isActive ? 'ring-2 ring-yellow-400 ring-offset-1 animate-pulse shadow-lg' : ''}
                                                        \${isNewlyAdded ? 'ring-2 ring-green-400 ring-offset-1 scale-105 shadow-xl transition-transform' : ''} \${isPast ? 'opacity-60 grayscale' : ''}\`}
                                                        style={{
                                                            top: \`\${itemY}px\`,
                                                            height: \`\${height}px\`,
                                                            backgroundColor: getTaskColor(wb.task.id),
                                                            opacity: selectionMode && !isSelected ? 0.5 : undefined,
                                                            zIndex: isActive || isNewlyAdded || (resizingBlockId === wb.id) ? 30 : 20
                                                        }}`;
const replaceBlock = `                                                    <div
                                                        key={\`block-\${wb.id}-\${index}\`}
                                                        draggable={!selectionMode && !resizingBlockId}
                                                        onDragStart={(e) => handleDragStart(e, wb)}
                                                        onDragEnd={handleDragEnd}
                                                        className={\`absolute group p-2 rounded-md text-[10px] sm:text-xs text-white shadow-sm transition-transform duration-200 overflow-hidden \${selectionMode
                                                            ? 'cursor-pointer hover:opacity-100'
                                                            : 'cursor-grab active:cursor-grabbing hover:shadow-md'
                                                            } \${isSelected ? 'ring-2 ring-blue-500 ring-offset-1 opacity-100' : 'opacity-95'} 
                                                        \${isActive ? 'ring-2 ring-yellow-400 ring-offset-1 animate-pulse shadow-lg' : ''}
                                                        \${isNewlyAdded ? 'ring-2 ring-green-400 ring-offset-1 scale-105 shadow-xl transition-transform' : ''} \${isPast ? 'opacity-60 grayscale' : ''}\`}
                                                        style={{
                                                            top: \`\${itemY}px\`,
                                                            left: itemStyles.get(item)?.left || '4px',
                                                            width: itemStyles.get(item)?.width || 'calc(100% - 8px)',
                                                            height: \`\${height}px\`,
                                                            backgroundColor: getTaskColor(wb.task.id),
                                                            opacity: selectionMode && !isSelected ? 0.5 : undefined,
                                                            zIndex: (isActive || isNewlyAdded || (resizingBlockId === wb.id) ? 30 : 20) + (itemStyles.get(item)?.zIndexOffset || 0)
                                                        }}`;

const targetTask = `                                                    <div
                                                        key={\`task-\${t.id}-\${index}\`}
                                                        className={\`absolute left-1 right-1 p-1 rounded border text-[9px] sm:text-[10px] shadow-sm cursor-pointer flex items-center gap-1 overflow-hidden \${isDone ? 'border-gray-200 bg-gray-50 text-gray-500 hover:bg-gray-100 opacity-70' : 'border-red-200 bg-red-50 text-red-700 hover:bg-red-100 font-medium'}\`}
                                                        style={{
                                                            top: \`\${itemY - height / 2}px\`,  // centered
                                                            height: \`\${height}px\`,
                                                            zIndex: 15
                                                        }}`;

const replaceTask = `                                                    <div
                                                        key={\`task-\${t.id}-\${index}\`}
                                                        className={\`absolute p-1 rounded border text-[9px] sm:text-[10px] shadow-sm cursor-pointer flex items-center gap-1 overflow-hidden \${isDone ? 'border-gray-200 bg-gray-50 text-gray-500 hover:bg-gray-100 opacity-70' : 'border-red-200 bg-red-50 text-red-700 hover:bg-red-100 font-medium'}\`}
                                                        style={{
                                                            top: \`\${itemY - height / 2}px\`,  // centered
                                                            height: \`\${height}px\`,
                                                            left: itemStyles.get(item)?.left || '4px',
                                                            width: itemStyles.get(item)?.width || 'calc(100% - 8px)',
                                                            zIndex: 15 + (itemStyles.get(item)?.zIndexOffset || 0)
                                                        }}`;

if (!content.includes(target1)) console.error('Target 1 not found');
if (!content.includes(targetPeriod)) console.error('Target Period not found');
if (!content.includes(targetBlock)) console.error('Target Block not found');
if (!content.includes(targetTask)) console.error('Target Task not found');

content = content.replace(target1, replace1)
    .replace(targetPeriod, replacePeriod)
    .replace(targetBlock, replaceBlock)
    .replace(targetTask, replaceTask);

fs.writeFileSync(file, content);
console.log('Done replacement.');
