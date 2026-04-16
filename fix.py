import sys

filepath = 'c:\\Planer\\app\\components\\Calendar.tsx'

with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

part1 = content.split('if (!confirm(message)) return;')[0]
part2 = content.split('const startDuration = resizeRef.current.startDuration;')[1]

middle = """if (!confirm(message)) return;

        try {
            const promises = [];

            if (selectedBlockIds.size > 0) {
                promises.push(fetch('/api/plan/bulk-delete', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ ids: Array.from(selectedBlockIds) })
                }));
            }

            if (selectedCourseIds.size > 0) {
                promises.push(fetch('/api/courses/bulk-delete', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ ids: Array.from(selectedCourseIds) })
                }));
            }

            const results = await Promise.all(promises);
            const allOk = results.every(res => res.ok);

            if (allOk) {
                // Optimistic update
                setWorkBlocks(workBlocks.filter(b => !selectedBlockIds.has(b.id)));
                setSelectedBlockIds(new Set());
                setSelectedCourseIds(new Set());
                setSelectionMode(false);
                router.refresh();
            } else {
                alert('Failed to delete some items');
            }
        } catch (e) {
            alert('Error deleting items');
        }
    };

    const nextWeek = () => setCurrentWeekStart(addDays(currentWeekStart, 7));
    const prevWeek = () => setCurrentWeekStart(addDays(currentWeekStart, -7));

    // Task Handlers
    const handleTaskUpdate = (updatedTask: Task) => {
        setTasks(tasks.map(t => t.id === updatedTask.id ? { ...t, ...updatedTask } : t));
    };

    const handleTaskDelete = (taskId: string) => {
        setTasks(tasks.filter(t => t.id !== taskId));
        setWorkBlocks(workBlocks.filter(b => b.task.id !== taskId));
    };

    // Block Handlers
    const handleBlockUpdate = (updatedBlock: WorkBlock) => {
        setWorkBlocks(workBlocks.map(b => b.id === updatedBlock.id ? { ...b, ...updatedBlock } : b));
    };

    const handleBlockDelete = (blockId: string) => {
        setWorkBlocks(workBlocks.filter(b => b.id !== blockId));
    };

    // Initialize Mobile Drag and Drop Polyfill
    useEffect(() => {
        let isMounted = true;
        const initDragDrop = async () => {
            try {
                const { polyfill } = await import('mobile-drag-drop');
                const { scrollBehaviourDragImageTranslateOverride } = await import('mobile-drag-drop/scroll-behaviour');
                // @ts-ignore
                await import('mobile-drag-drop/default.css');

                if (isMounted) {
                    polyfill({
                        dragImageTranslateOverride: scrollBehaviourDragImageTranslateOverride,
                        holdToDrag: 100 // Smooth touch drag pickup
                    });
                }
            } catch (e) {
                console.error("Failed to load mobile drag and drop", e);
            }
        };

        if (typeof window !== 'undefined') {
            initDragDrop();
            const touchListener = () => { };
            window.addEventListener('touchmove', touchListener, { passive: false });
            return () => {
                isMounted = false;
                window.removeEventListener('touchmove', touchListener);
            };
        }
    }, []);

    const [isDragging, setIsDragging] = useState(false);
    const [dragOverDay, setDragOverDay] = useState<string | null>(null);
    const dragTimerRef = useRef<NodeJS.Timeout | null>(null);

    const resizeRef = useRef<{ id: string, startY: number, startDuration: number, endDuration: number } | null>(null);
    const wasResizingRef = useRef<boolean>(false);
    const [resizingBlockId, setResizingBlockId] = useState<string | null>(null);
    const [resizingDuration, setResizingDuration] = useState<number | null>(null);

    const handleResizeStart = (e: React.PointerEvent<HTMLDivElement>, block: WorkBlock) => {
        e.stopPropagation();
        e.preventDefault();
        wasResizingRef.current = true;
        const clientY = e.clientY;
        resizeRef.current = { id: block.id, startY: clientY, startDuration: block.durationMinutes, endDuration: block.durationMinutes };
        setResizingBlockId(block.id);
        setResizingDuration(block.durationMinutes);

        const handleMove = (ev: PointerEvent) => {
            if (!resizeRef.current) return;
            const deltaY = ev.clientY - resizeRef.current.startY;
            const deltaMins = Math.round(deltaY / 1);
            const newD = Math.max(15, Math.ceil((resizeRef.current.startDuration + deltaMins) / 15) * 15);
            resizeRef.current.endDuration = newD;
            setResizingDuration(newD);
        };

        const handleEnd = async () => {
            document.removeEventListener('pointermove', handleMove);
            document.removeEventListener('pointerup', handleEnd);
            document.removeEventListener('pointercancel', handleEnd);

            if (!resizeRef.current) return;
            const blockId = resizeRef.current.id;
            const finalDuration = resizeRef.current.endDuration;
            const startDuration = resizeRef.current.startDuration;"""

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(part1 + middle + part2)
