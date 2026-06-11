/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { AppState } from '../../lib/types';
import { 
  createBoard, deleteBoard, 
  createColumn, deleteColumn, 
  createTask, updateTask, deleteTask, 
  addComment 
} from '../../services/api';
import { 
  Plus, Trash2, Edit2, Calendar, User as UserIcon, Tag, AlertTriangle, 
  MessageSquare, Layers, UserPlus, CheckCircle, Clock, ChevronRight, X, ArrowLeftRight, Search, SlidersHorizontal 
} from 'lucide-react';
import { motion } from 'motion/react';

interface KanbanBoardViewProps {
  state: AppState;
  onRefreshState: (updatedState?: AppState) => void;
}

export default function KanbanBoardView({ state, onRefreshState }: KanbanBoardViewProps) {
  const { boards, columns, tasks, users, currentUser, comments, billing } = state;

  // Active Board state
  const [activeBoardId, setActiveBoardId] = useState<string>(boards[0]?.id || '');
  
  // Creating Board form
  const [showNewBoardForm, setShowNewBoardForm] = useState(false);
  const [newBoardName, setNewBoardName] = useState('');
  const [newBoardDesc, setNewBoardDesc] = useState('');

  // Creating Column form
  const [showNewColMap, setShowNewColMap] = useState<Record<string, boolean>>({});
  const [newColName, setNewColName] = useState('');

  // Quick Create Task form
  const [showNewTaskColId, setShowNewTaskColId] = useState<string | null>(null);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskDesc, setNewTaskDesc] = useState('');
  const [newTaskPriority, setNewTaskPriority] = useState<'low' | 'medium' | 'high'>('medium');
  const [newTaskDue, setNewTaskDue] = useState('2026-06-10');
  const [newTaskAssignee, setNewTaskAssignee] = useState('');
  const [newTaskLabels, setNewTaskLabels] = useState<string[]>([]);
  const [newLabelInput, setNewLabelInput] = useState('');

  // Task Details Modal
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [activeCommentText, setActiveCommentText] = useState('');

  // Search & Filtering States
  const [searchQuery, setSearchQuery] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [assigneeFilter, setAssigneeFilter] = useState('all');

  // HTML5 Native Drag & Drop states
  const [draggedTaskId, setDraggedTaskId] = useState<string | null>(null);
  const [dragOverColId, setDragOverColId] = useState<string | null>(null);

  // Error boundary feedback states
  const [errorText, setErrorText] = useState<string | null>(null);
  const [infoText, setInfoText] = useState<string | null>(null);

  const activeBoard = boards.find(b => b.id === activeBoardId) || boards[0];
  const boardColumns = activeBoard ? columns.filter(c => c.boardId === activeBoard.id).sort((a,b) => a.order - b.order) : [];

  const displayError = (msg: string) => {
    setErrorText(msg);
    setTimeout(() => setErrorText(null), 6000);
  };

  const displayInfo = (msg: string) => {
    setInfoText(msg);
    setTimeout(() => setInfoText(null), 4000);
  };

  // ----------------------------------------------------------------------
  // Handlers
  // ----------------------------------------------------------------------

  const handleCreateBoard = async (e: React.FormEvent) => {
    e.preventDefault();
    if (currentUser.role === 'Viewer') {
      displayError('RBAC Access Denied: Viewer sessions are strictly read-only and cannot create boards.');
      return;
    }
    if (!newBoardName.trim()) {
      displayError('Board name cannot be blank.');
      return;
    }
    try {
      const res = await createBoard(newBoardName, newBoardDesc);
      onRefreshState(res.state);
      setActiveBoardId(res.board.id);
      setNewBoardName('');
      setNewBoardDesc('');
      setShowNewBoardForm(false);
      displayInfo(`Board "${res.board.name}" provisioned successfully.`);
    } catch (err: any) {
      displayError(err.message);
    }
  };

  const handleDeleteBoard = async () => {
    if (!activeBoard) return;
    if (currentUser.role !== 'Admin') {
      displayError('RBAC Access Denied: Only Admins can delete Kanban board projects.');
      return;
    }
    if (confirm(`Confirm deletion of Kanban board: "${activeBoard.name}"? This cascades to all tasks and columns!`)) {
      try {
        const res = await deleteBoard(activeBoard.id);
        onRefreshState(res.state);
        setActiveBoardId(res.state.boards[0]?.id || '');
        displayInfo('Board permanently and cascade-deleted.');
      } catch (err: any) {
        displayError(err.message);
      }
    }
  };

  const handleCreateColumn = async (boardId: string) => {
    if (currentUser.role === 'Viewer') {
      displayError('RBAC Access Denied: Viewer sessions are strictly read-only and cannot create status columns.');
      return;
    }
    if (!newColName.trim()) {
      displayError('Column name cannot be blank.');
      return;
    }
    const alreadyExists = columns.some(c => c.boardId === boardId && c.name.toLowerCase().trim() === newColName.toLowerCase().trim());
    if (alreadyExists) {
      displayError('A column with this name already exists on this board.');
      return;
    }

    try {
      const res = await createColumn(boardId, newColName);
      onRefreshState(res.state);
      setNewColName('');
      setShowNewColMap({});
      displayInfo(`Column "${colNameFormat(newColName)}" created successfully.`);
    } catch (err: any) {
      displayError(err.message);
    }
  };

  const colNameFormat = (name: string) => name.trim();

  const handleDeleteColumn = async (colId: string) => {
    if (currentUser.role === 'Viewer') {
      displayError('RBAC Access Denied: Viewer sessions are strictly read-only and cannot delete columns.');
      return;
    }
    if (confirm('Delete this column and all its assigned tasks? This is irreversible.')) {
      try {
        const res = await deleteColumn(colId);
        onRefreshState(res.state);
        displayInfo('Column and all task contents removed.');
      } catch (err: any) {
        displayError(err.message);
      }
    }
  };

  const handleCreateTask = async (e: React.FormEvent, columnId: string) => {
    e.preventDefault();
    if (currentUser.role === 'Viewer') {
      displayError('RBAC Access Denied: Viewer sessions are strictly read-only and cannot deploy task cards.');
      return;
    }
    if (!newTaskTitle.trim()) {
      displayError('Task card title is required.');
      return;
    }
    try {
      const res = await createTask({
        columnId,
        title: newTaskTitle,
        description: newTaskDesc,
        priority: newTaskPriority,
        dueDate: newTaskDue,
        assigneeId: newTaskAssignee || undefined,
        labels: newTaskLabels
      });
      onRefreshState(res.state);
      
      // Clear task states
      setNewTaskTitle('');
      setNewTaskDesc('');
      setNewTaskPriority('medium');
      setNewTaskDue('2026-06-10');
      setNewTaskAssignee('');
      setNewTaskLabels([]);
      setShowNewTaskColId(null);
      displayInfo('Task deployed to board.');
    } catch (err: any) {
      displayError(err.message);
    }
  };

  const handleMoveTaskColumn = async (taskId: string, targetColId: string) => {
    if (currentUser.role === 'Viewer') {
      displayError('RBAC Access Denied: Viewer sessions are strictly read-only and cannot transition tasks.');
      return;
    }
    try {
      const res = await updateTask(taskId, { columnId: targetColId });
      onRefreshState(res.state);
      displayInfo('Task state changed.');
    } catch (err: any) {
      displayError(err.message);
    }
  };

  const handleDeleteTask = async (taskId: string) => {
    if (currentUser.role === 'Viewer') {
      displayError('RBAC Access Denied: Viewer sessions are strictly read-only and cannot remove tasks.');
      return;
    }
    if (confirm('Delete this task card permanently?')) {
      try {
        const res = await deleteTask(taskId);
        onRefreshState(res.state);
        setSelectedTaskId(null);
        displayInfo('Task card deleted.');
      } catch (err: any) {
        displayError(err.message);
      }
    }
  };

  const handlePostComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (currentUser.role === 'Viewer') {
      displayError('RBAC Access Denied: Viewer sessions are strictly read-only and cannot publish comment entries.');
      return;
    }
    if (!selectedTaskId || !activeCommentText.trim()) return;
    try {
      const res = await addComment(selectedTaskId, activeCommentText);
      onRefreshState(res.state);
      setActiveCommentText('');
      displayInfo('Comment posted.');
    } catch (err: any) {
      displayError(err.message);
    }
  };

  const addLabelToTaskForm = () => {
    const fresh = newLabelInput.trim();
    if (fresh && !newTaskLabels.includes(fresh)) {
      setNewTaskLabels(p => [...p, fresh]);
      setNewLabelInput('');
    }
  };

  // ----------------------------------------------------------------------
  // Drag and Drop implementation
  // ----------------------------------------------------------------------
  const handleDragStart = (e: React.DragEvent, taskId: string) => {
    e.dataTransfer.setData('text/plain', taskId);
    setDraggedTaskId(taskId);
  };

  const handleDropOnColumn = async (e: React.DragEvent, colId: string) => {
    e.preventDefault();
    const taskId = e.dataTransfer.getData('text/plain') || draggedTaskId;
    setDragOverColId(null);
    setDraggedTaskId(null);

    if (!taskId) return;

    const taskToMove = tasks.find(t => t.id === taskId);
    if (!taskToMove) return;

    if (taskToMove.columnId === colId) return; // same status list, ignore

    if (currentUser.role === 'Viewer') {
      displayError('RBAC Access Denied: Viewers cannot move task cards.');
      return;
    }

    try {
      // Move of columns
      const res = await updateTask(taskId, { columnId: colId });
      onRefreshState(res.state);
      displayInfo('Task transitioned instantly.');
    } catch (err: any) {
      displayError(err.message);
    }
  };

  const selectedTask = selectedTaskId ? tasks.find(t => t.id === selectedTaskId) : null;
  const taskComments = selectedTaskId ? comments.filter(c => c.taskId === selectedTaskId) : [];

  return (
    <div className="space-y-6" id="boards-view-container">
      {/* Alert Feedbacks */}
      {errorText && (
        <div className="p-4 bg-rose-50 border-l-4 border-rose-500 rounded-r-xl text-rose-800 text-xs flex gap-3 shadow-sm select-none">
          <AlertTriangle className="w-5 h-5 flex-shrink-0 text-rose-500" />
          <div>
            <p className="font-semibold text-sm">Action Blocked (SaaS Rule Enforcement)</p>
            <p className="mt-0.5">{errorText}</p>
          </div>
        </div>
      )}

      {infoText && (
        <div className="p-3 bg-slate-900 border border-slate-800 text-slate-100 rounded-xl text-xs flex gap-2.5 items-center justify-between shadow-lg select-none">
          <span className="flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-emerald-400" /> {infoText}
          </span>
        </div>
      )}

      {/* Board Selector & Management Strip */}
      <div className="flex flex-col lg:flex-row justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200/60 shadow-xs" id="boards-strip-header">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-indigo-50 text-indigo-600 rounded-xl shrink-0">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <label className="text-[10px] uppercase tracking-wider text-slate-400 font-mono font-bold block">SaaS Active Board</label>
              <div className="flex items-center gap-2 mt-0.5">
                {boards.length === 0 ? (
                  <span className="text-slate-500 text-sm italic">No active board. Create one below.</span>
                ) : (
                  <select
                    value={activeBoardId}
                    onChange={(e) => {
                      setActiveBoardId(e.target.value);
                      setSearchQuery('');
                      setPriorityFilter('all');
                      setAssigneeFilter('all');
                    }}
                    className="bg-slate-50 text-slate-800 border border-slate-200 focus:border-indigo-500 font-semibold px-3 py-1.5 rounded-lg text-sm outline-none transition-all cursor-pointer"
                  >
                    {boards.map(b => (
                      <option key={b.id} value={b.id}>
                        {b.name}
                      </option>
                    ))}
                  </select>
                )}
              </div>
            </div>
          </div>

          {/* Quick search/filtering system */}
          {activeBoard && (
            <div className="flex flex-wrap items-center gap-2 border-t sm:border-t-0 sm:border-l border-slate-105 pt-3 sm:pt-0 sm:pl-4">
              {/* Search inputs */}
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 w-3.5 h-3.5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Filter cards..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="bg-slate-50 border border-slate-205 text-[11px] placeholder-slate-400 rounded-lg pl-8 pr-3 py-2 w-36 sm:w-44 outline-none focus:border-indigo-400 focus:bg-white transition-all text-slate-800 font-medium"
                />
              </div>

              {/* Priority filters */}
              <select
                value={priorityFilter}
                onChange={(e) => setPriorityFilter(e.target.value)}
                className="bg-slate-50 border border-slate-205 text-[11px] text-slate-600 rounded-lg px-2.5 py-2 outline-none cursor-pointer focus:border-indigo-400"
              >
                <option value="all">Priority: All</option>
                <option value="high">Priority: High</option>
                <option value="medium">Priority: Medium</option>
                <option value="low">Priority: Low</option>
              </select>

              {/* Assignee filters */}
              <select
                value={assigneeFilter}
                onChange={(e) => setAssigneeFilter(e.target.value)}
                className="bg-slate-50 border border-slate-205 text-[11px] text-slate-600 rounded-lg px-2.5 py-2 outline-none cursor-pointer focus:border-indigo-400"
              >
                <option value="all">Assignee: All</option>
                <option value="unassigned">Unassigned</option>
                {users.map(u => (
                  <option key={u.id} value={u.id}>{u.name}</option>
                ))}
              </select>
            </div>
          )}
        </div>

        {/* Board Meta/Description and Action triggers */}
        <div className="flex flex-wrap items-center gap-2 mt-2 lg:mt-0 shrink-0">
          {activeBoard && (
            <button
              onClick={handleDeleteBoard}
              disabled={currentUser.role !== 'Admin'}
              className={`p-2 rounded-xl text-slate-400 hover:text-rose-500 hover:bg-rose-50 transition-all ${currentUser.role !== 'Admin' ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'}`}
              title="Delete Active Board (Admin Only)"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}

          <button
            onClick={() => setShowNewBoardForm(!showNewBoardForm)}
            className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs px-4 py-2.5 rounded-xl flex items-center gap-1.5 transition-all shadow-xs active:scale-98 cursor-pointer"
          >
            <Plus className="w-4 h-4 text-white" /> New Kanban Workspace
          </button>
        </div>
      </div>

      {/* Embedded New Board Form */}
      {showNewBoardForm && (
        <motion.div
          initial={{ opacity: 0, y: -15 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-indigo-50/40 border border-indigo-100 p-5 rounded-2xl space-y-4"
        >
          <div className="flex items-center justify-between">
            <h3 className="font-display font-semibold text-indigo-950 text-sm">Provision New Agile Workspace Board</h3>
            <button onClick={() => setShowNewBoardForm(false)} className="text-slate-450 hover:text-slate-600 cursor-pointer">
              <X className="w-4 h-4" />
            </button>
          </div>
          <form onSubmit={handleCreateBoard} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wide">Board Name *</label>
              <input
                type="text"
                required
                value={newBoardName}
                onChange={(e) => setNewBoardName(e.target.value)}
                placeholder="e.g. Acme SaaS Campaign"
                className="w-full bg-white border border-slate-205 rounded-xl px-3.5 py-2.5 text-xs text-slate-800 focus:ring-2 focus:ring-indigo-100 focus:border-indigo-500 outline-none font-medium"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wide">Target Objective / Description</label>
              <input
                type="text"
                value={newBoardDesc}
                onChange={(e) => setNewBoardDesc(e.target.value)}
                placeholder="Objectives and scope definition parameters."
                className="w-full bg-white border border-slate-205 rounded-xl px-3.5 py-2.5 text-xs text-slate-800 focus:ring-2 focus:ring-indigo-100 focus:border-indigo-500 outline-none font-medium"
              />
            </div>
            <div className="md:col-span-2 flex justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => setShowNewBoardForm(false)}
                className="px-4 py-2 border border-slate-200 text-slate-500 rounded-lg text-xs font-semibold hover:bg-slate-50 transition"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-xs font-semibold hover:bg-indigo-700 transition"
              >
                Build Workspace Board
              </button>
            </div>
          </form>
        </motion.div>
      )}

      {/* Active board header objective bar */}
      {activeBoard && activeBoard.description && (
        <div className="text-xs text-slate-500 bg-white px-4 py-3 rounded-xl border border-slate-200/55 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1.5">
          <span><strong>Strategic Objective:</strong> {activeBoard.description}</span>
          <span className="text-[10px] font-mono text-slate-400">Initialized: {new Date(activeBoard.createdAt).toLocaleDateString()}</span>
        </div>
      )}

      {/* Columns & Task Cards Swimlanes Scrollable Section */}
      <div 
        className="flex flex-col md:flex-row gap-4 items-start overflow-x-auto pb-4 snap-x no-scrollbar w-full" 
        id="kanban-swimlanes"
      >
        {boardColumns.map(col => {
          // Select task with active search/filter settings applied
          let colTasks = tasks.filter(t => t.columnId === col.id);
          
          if (searchQuery.trim() !== '') {
            const queryClean = searchQuery.toLowerCase().trim();
            colTasks = colTasks.filter(t => 
              t.title.toLowerCase().includes(queryClean) || 
              t.description.toLowerCase().includes(queryClean) ||
              t.labels.some(l => l.toLowerCase().includes(queryClean))
            );
          }

          if (priorityFilter !== 'all') {
            colTasks = colTasks.filter(t => t.priority === priorityFilter);
          }

          if (assigneeFilter !== 'all') {
            if (assigneeFilter === 'unassigned') {
              colTasks = colTasks.filter(t => !t.assigneeId);
            } else {
              colTasks = colTasks.filter(t => t.assigneeId === assigneeFilter);
            }
          }

          // Sort by active order value
          colTasks = colTasks.sort((a,b) => a.order - b.order);

          return (
            <div 
              key={col.id} 
              onDragOver={(e) => {
                if (currentUser.role !== 'Viewer') {
                  e.preventDefault();
                  if (dragOverColId !== col.id) setDragOverColId(col.id);
                }
              }}
              onDragLeave={() => setDragOverColId(null)}
              onDrop={(e) => handleDropOnColumn(e, col.id)}
              className={`w-full md:w-80 shrink-0 snap-center bg-slate-100/60 rounded-2xl border p-4.5 min-h-[480px] transition-all flex flex-col justify-between ${
                dragOverColId === col.id 
                  ? 'border-indigo-400 ring-4 ring-indigo-500/10 bg-indigo-50/10' 
                  : 'border-slate-205'
              }`}
            >
              {/* Column header title */}
              <div>
                <div className="flex items-center justify-between mb-3.5 border-b border-slate-200 pb-2.5">
                  <div className="flex items-center gap-2">
                    <span className="font-display font-bold text-slate-800 text-sm tracking-tight">{col.name}</span>
                    <span className="text-[10px] font-mono bg-slate-250 text-slate-600 px-2 py-0.5 rounded-full font-bold">
                      {colTasks.length}
                    </span>
                  </div>
                  {currentUser.role === 'Admin' && (
                    <button
                      onClick={() => handleDeleteColumn(col.id)}
                      className="text-slate-400 hover:text-rose-600 cursor-pointer p-0.5 hover:bg-slate-200/75 rounded transition-all"
                      title="Delete Column"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                {/* Task Cards Stack */}
                <div className="space-y-3 min-h-[50px]">
                  {colTasks.length === 0 ? (
                    <div className="text-[11px] text-slate-400 py-6 text-center italic border border-dashed border-slate-200/60 rounded-xl relative select-none">
                      Empty Lane
                    </div>
                  ) : (
                    colTasks.map(task => {
                      const assignee = users.find(u => u.id === task.assigneeId);
                      const taskCommentCount = comments.filter(c => c.taskId === task.id).length;
                      
                      // Due comparison względem June 5th, 2026
                      const isOverdue = task.dueDate < '2026-06-05' && col.id !== 'c4';
                      
                      return (
                        <div
                          key={task.id}
                          draggable={currentUser.role !== 'Viewer'}
                          onDragStart={(e) => handleDragStart(e, task.id)}
                          className={`bg-white border select-none rounded-xl p-3.5 shadow-sm space-y-2.5 cursor-pointer hover:border-indigo-400 hover:shadow-xs hover:-translate-y-0.5 transition-all duration-200 group relative ${
                            draggedTaskId === task.id ? 'opacity-45 border-dashed border-indigo-300 bg-indigo-50/10 shadow-none' : 'border-slate-200'
                          }`}
                          onClick={() => setSelectedTaskId(task.id)}
                        >
                          {/* Card Content Row */}
                          <div className="flex items-start justify-between gap-1.5">
                            <h4 className="text-xs font-bold text-slate-800 leading-snug group-hover:text-indigo-600 tracking-tight">{task.title}</h4>
                            <span className={`text-[8px] uppercase tracking-wider font-mono font-black px-1.5 py-0.5 rounded-md shrink-0 ${
                              task.priority === 'high' ? 'bg-rose-50 text-rose-600 border border-rose-100' :
                              task.priority === 'medium' ? 'bg-amber-50 text-amber-600 border border-amber-100' :
                              'bg-slate-50 text-slate-500 border border-slate-200'
                            }`}>
                              {task.priority}
                            </span>
                          </div>

                          {task.description && (
                            <p className="text-[11px] text-slate-500 line-clamp-2 leading-relaxed font-normal">{task.description}</p>
                          )}

                          {/* Task Label Tags */}
                          {task.labels && task.labels.length > 0 && (
                            <div className="flex flex-wrap gap-1 pt-0.5">
                              {task.labels.map((lab, labelIdx) => (
                                <span key={labelIdx} className="text-[8px] font-mono uppercase bg-indigo-50 border border-indigo-100/50 text-indigo-600 px-1.5 py-0.2 rounded font-semibold">
                                  {lab}
                                </span>
                              ))}
                            </div>
                          )}

                          {/* Card footer details */}
                          <div className="flex items-center justify-between border-t border-slate-105 pt-2.5 mt-2.5">
                            <div className="flex items-center gap-1.5 text-[10px] text-slate-500 font-mono">
                              <Clock className={`w-3.5 h-3.5 ${isOverdue ? 'text-rose-500 animate-pulse' : 'text-slate-400'}`} />
                              <span className={isOverdue ? 'text-rose-600 font-bold' : ''}>
                                {task.dueDate} {isOverdue && '(OVERDUE)'}
                              </span>
                            </div>

                            <div className="flex items-center gap-2 shrink-0">
                              {taskCommentCount > 0 && (
                                <span className="flex items-center gap-0.5 text-[10px] font-mono text-slate-400">
                                  <MessageSquare className="w-3.5 h-3.5 text-slate-300" />
                                  {taskCommentCount}
                                </span>
                              )}

                              {assignee ? (
                                <img
                                  src={assignee.avatarUrl}
                                  alt={assignee.name}
                                  className="w-5 h-5 rounded-full ring-1 ring-slate-200"
                                  title={`Assigned to ${assignee.name}`}
                                />
                              ) : (
                                <span className="p-0.5 bg-slate-50 text-slate-400 rounded-full border border-slate-200" title="Unassigned">
                                  <UserIcon className="w-3.5 h-3.5" />
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Relocate Action fallback select box */}
                          <div 
                            className="mt-2.5 pt-2 border-t border-dashed border-slate-105 flex items-center justify-between gap-1 w-full"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <label className="text-[9px] font-mono tracking-wide text-slate-400/80 flex items-center gap-0.5">
                              <ArrowLeftRight className="w-2.5 h-2.5 text-slate-400" /> Relocate:
                            </label>
                            <select
                              value={task.columnId}
                              onChange={(e) => handleMoveTaskColumn(task.id, e.target.value)}
                              disabled={currentUser.role === 'Viewer'}
                              className="bg-slate-50 border border-slate-200 rounded text-[9.5px] font-medium text-slate-500 p-0.5 max-w-28 focus:border-indigo-400 focus:bg-white outline-none cursor-pointer"
                            >
                              {columns.filter(c => c.boardId === activeBoardId).map(colItem => (
                                <option key={colItem.id} value={colItem.id}>
                                  ➔ {colItem.name}
                                </option>
                              ))}
                            </select>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              {/* Add Card button helper */}
              <div className="mt-3">
                {showNewTaskColId === col.id ? (
                  <form 
                    onSubmit={(e) => handleCreateTask(e, col.id)}
                    className="p-3 bg-white border border-indigo-100 rounded-xl space-y-2.5 shadow-xs"
                  >
                    <div className="flex items-center justify-between border-b border-slate-101 pb-1.5">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">New Task Card</span>
                      <button 
                        type="button" 
                        onClick={() => setShowNewTaskColId(null)} 
                        className="text-slate-400 hover:text-slate-600 cursor-pointer"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <input
                      type="text"
                      required
                      placeholder="Task Title *"
                      value={newTaskTitle}
                      onChange={(e) => setNewTaskTitle(e.target.value)}
                      className="w-full text-xs font-semibold bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 focus:border-indigo-500 focus:bg-white outline-none text-slate-800"
                    />

                    <textarea
                      placeholder="Requirements detail description..."
                      value={newTaskDesc}
                      onChange={(e) => setNewTaskDesc(e.target.value)}
                      className="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 focus:border-indigo-500 focus:bg-white outline-none h-14 text-slate-800 resize-none font-sans"
                    />

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-[9px] uppercase font-bold text-slate-400">Priority</label>
                        <select
                          value={newTaskPriority}
                          onChange={(e) => setNewTaskPriority(e.target.value as any)}
                          className="w-full bg-slate-50 border border-slate-200 rounded text-[10.5px] p-1 outline-none text-slate-600 focus:border-indigo-400"
                        >
                          <option value="low">Low</option>
                          <option value="medium">Medium</option>
                          <option value="high">High</option>
                        </select>
                      </div>

                      <div>
                        <label className="text-[9px] uppercase font-bold text-slate-400">Due Date</label>
                        <input
                          type="date"
                          value={newTaskDue}
                          onChange={(e) => setNewTaskDue(e.target.value)}
                          className="w-full bg-slate-50 border border-slate-200 rounded text-[10px] p-1 outline-none text-slate-600 focus:border-indigo-400"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="text-[9px] uppercase font-bold text-slate-400">Assign Member</label>
                      <select
                        value={newTaskAssignee}
                        onChange={(e) => setNewTaskAssignee(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 rounded text-[10.5px] p-1 outline-none text-slate-650 focus:border-indigo-400"
                      >
                        <option value="">Unassigned</option>
                        {users.map(u => (
                          <option key={u.id} value={u.id}>{u.name} ({u.role})</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="text-[9px] uppercase font-bold text-slate-400">Label Tags</label>
                      <div className="flex gap-1.5">
                        <input
                          type="text"
                          placeholder="e.g. API"
                          value={newLabelInput}
                          onChange={(e) => setNewLabelInput(e.target.value)}
                          className="flex-1 text-[10.5px] bg-slate-50 border border-slate-200 rounded px-2 outline-none text-slate-800 focus:border-indigo-400"
                        />
                        <button
                          type="button"
                          onClick={addLabelToTaskForm}
                          className="px-2.5 py-1 bg-slate-100 text-[10.5px] text-slate-600 rounded-lg hover:bg-slate-200 font-semibold cursor-pointer"
                        >
                          Add
                        </button>
                      </div>
                      {newTaskLabels.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-1.5">
                          {newTaskLabels.map((lab, labelIndex) => (
                            <span key={labelIndex} className="text-[8px] font-mono bg-indigo-50 text-indigo-600 px-1.5 py-0.5 rounded border border-indigo-100 flex items-center gap-1">
                              {lab}
                              <button type="button" onClick={() => setNewTaskLabels(p => p.filter(x => x !== lab))} className="text-rose-400 shrink-0 font-bold">×</button>
                            </span>
                          ))}
                        </div>
                      )}
                    </div>

                    <button
                      type="submit"
                      className="w-full bg-indigo-600 text-white font-bold text-[11px] py-2 rounded-lg hover:bg-indigo-700 transition cursor-pointer"
                    >
                      Deploy Task Card
                    </button>
                  </form>
                ) : (
                  <button
                    onClick={() => {
                      if (currentUser.role === 'Viewer') {
                        displayError('RBAC Access Denied: Viewers cannot create tasks.');
                        return;
                      }
                      setShowNewTaskColId(col.id);
                    }}
                    className="w-full border border-dashed border-slate-300 hover:border-indigo-400 hover:bg-indigo-50/20 text-slate-550 hover:text-indigo-600 font-bold text-xs py-2.5 rounded-xl flex items-center justify-center gap-1 transition-all cursor-pointer"
                  >
                    <Plus className="w-4 h-4" /> Add Card
                  </button>
                )}
              </div>
            </div>
          );
        })}

        {/* Deploy Column Swimlane Option */}
        {activeBoardId && (
          <div className="w-full md:w-80 shrink-0 snap-center bg-slate-100/30 border border-dashed border-slate-300 rounded-2xl p-4.5 flex flex-col justify-center min-h-[160px] cursor-pointer hover:bg-slate-105/50 hover:border-indigo-300 transition-all select-none">
            {showNewColMap[activeBoardId] ? (
              <div className="space-y-2.5">
                <input
                  type="text"
                  placeholder="e.g. In QA Review"
                  required
                  value={newColName}
                  onChange={(e) => setNewColName(e.target.value)}
                  className="w-full text-xs font-semibold bg-white border border-slate-205 rounded-xl px-3 py-2 focus:border-indigo-400 outline-none text-slate-800"
                />
                <div className="flex gap-1.5 justify-end">
                  <button
                    onClick={() => setShowNewColMap({})}
                    className="text-[11px] border border-slate-200 font-semibold px-2.5 py-1 rounded-lg text-slate-500 hover:bg-white cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => handleCreateColumn(activeBoardId)}
                    className="text-[11px] bg-indigo-600 hover:bg-indigo-700 font-bold px-3 py-1 text-white rounded-lg cursor-pointer"
                  >
                    Deploy Column
                  </button>
                </div>
              </div>
            ) : (
              <div 
                className="flex flex-col items-center justify-center text-slate-400 group hover:text-indigo-600 transition py-10"
                onClick={() => {
                  if (currentUser.role === 'Viewer') {
                    displayError('RBAC Access Denied: Viewers cannot create columns.');
                    return;
                  }
                  setShowNewColMap({ [activeBoardId]: true });
                }}
              >
                <Plus className="w-7 h-7 mb-1.5 text-slate-350 group-hover:text-indigo-500 shrink-0" />
                <span className="text-xs font-bold text-slate-500 group-hover:text-indigo-500">Add Board Column</span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Task Details Modal Overlay */}
      {selectedTaskId && selectedTask && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <motion.div
            initial={{ scale: 0.96, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white rounded-2xl border border-slate-200 max-w-2xl w-full max-h-[92vh] overflow-y-auto flex flex-col justify-between shadow-2xl"
          >
            {/* Header */}
            <div className="border-b border-slate-105 p-5 flex items-center justify-between bg-slate-50 rounded-t-2xl select-none">
              <div className="flex items-center gap-2">
                <span className="p-1 px-3 bg-indigo-55 text-indigo-750 text-[10px] font-mono font-black uppercase rounded-full">
                  Task Card Metadata
                </span>
                <span className={`text-[9px] uppercase font-mono font-black px-2 py-0.5 rounded-full ${
                  selectedTask.priority === 'high' ? 'bg-rose-100 text-rose-700' :
                  selectedTask.priority === 'medium' ? 'bg-amber-100 text-amber-700' :
                  'bg-slate-100 text-slate-600'
                }`}>
                  Priority: {selectedTask.priority}
                </span>
              </div>
              <button 
                onClick={() => setSelectedTaskId(null)} 
                className="text-slate-450 hover:text-slate-705 p-1 bg-slate-200/50 hover:bg-slate-200 rounded-lg transition-all cursor-pointer"
              >
                <X className="w-5 h-5 shrink-0" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-5">
              <div className="flex flex-col sm:flex-row justify-between items-start gap-3">
                <h3 className="font-display font-bold text-slate-900 text-lg leading-snug">{selectedTask.title}</h3>
                <button
                  onClick={() => handleDeleteTask(selectedTask.id)}
                  className="text-[11px] text-rose-500 font-bold flex items-center gap-1 hover:bg-rose-55 p-1.5 rounded-lg transition-all cursor-pointer shrink-0"
                >
                  <Trash2 className="w-3.5 h-3.5 text-rose-500" /> Delete Task Card
                </button>
              </div>

              {selectedTask.description && (
                <div className="space-y-1.5 bg-slate-50 p-4 rounded-xl border border-slate-200/50">
                  <span className="text-[10px] uppercase font-mono font-black text-slate-400 block">Statement Description</span>
                  <p className="text-xs text-slate-700 leading-relaxed whitespace-pre-wrap font-sans">{selectedTask.description}</p>
                </div>
              )}

              {/* Status and dates strip */}
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4 border-t border-b border-slate-100 py-4 font-sans text-xs">
                <div>
                  <span className="text-slate-450 font-bold block uppercase tracking-wide">DUE DATE:</span>
                  <span className="font-bold text-slate-800 flex items-center gap-1 mt-0.5">
                    <Calendar className="w-3.5 h-3.5 text-slate-400" />
                    {selectedTask.dueDate} 
                    {selectedTask.dueDate < '2026-06-05' && (
                      <span className="text-rose-500 font-black animate-pulse font-mono shrink-0">(OVERDUE)</span>
                    )}
                  </span>
                </div>

                <div>
                  <span className="text-slate-450 font-bold block uppercase tracking-wide">ASSIGNEE:</span>
                  <span className="font-bold text-slate-800 flex items-center gap-1.5 mt-0.5">
                    {users.find(u => u.id === selectedTask.assigneeId) ? (
                      <>
                        <img 
                          src={users.find(u => u.id === selectedTask.assigneeId)?.avatarUrl} 
                          alt="" 
                          className="w-4.5 h-4.5 rounded-full shrink-0" 
                        />
                        {users.find(u => u.id === selectedTask.assigneeId)?.name}
                      </>
                    ) : (
                      <span className="text-slate-400 italic">Unassigned context</span>
                    )}
                  </span>
                </div>

                <div>
                  <span className="text-slate-450 font-bold block uppercase tracking-wide">CURRENT COLUMN:</span>
                  <span className="font-semibold text-indigo-600 bg-indigo-50 border border-indigo-100/50 rounded-md px-2 py-0.5 inline-block mt-0.5 text-[11px] font-mono select-none">
                    {columns.find(c => c.id === selectedTask.columnId)?.name || 'Unknown'}
                  </span>
                </div>
              </div>

              {/* Comments Discussion */}
              <div className="space-y-3 pt-2">
                <span className="text-[10px] uppercase font-mono font-black text-slate-400 flex items-center gap-1 leading-none select-none">
                  <MessageSquare className="w-3.5 h-3.5 text-slate-400 shrink-0" /> Discussion Roster ({taskComments.length})
                </span>

                <div className="space-y-3 max-h-52 overflow-y-auto pr-1">
                  {taskComments.length === 0 ? (
                    <p className="text-[11px] text-slate-400 italic bg-slate-50 text-center py-4 rounded-xl border border-dashed border-slate-200 select-none">
                      No updates posted. Mention teammates utilizing @Name to trigger instant notification alerts.
                    </p>
                  ) : (
                    taskComments.map(c => {
                      const cUser = users.find(u => u.id === c.userId);
                      return (
                        <div key={c.id} className="bg-slate-50 rounded-xl p-3 border border-slate-100 space-y-1 text-slate-800 text-xs">
                          <div className="flex items-center justify-between">
                            <span className="font-bold flex items-center gap-1.5 text-slate-800">
                              <img src={cUser?.avatarUrl || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150'} alt="" className="w-4.5 h-4.5 rounded-full shrink-0" />
                              {c.userName} ({cUser?.role || 'Guest'})
                            </span>
                            <span className="text-[9px] text-slate-400 font-mono">
                              {new Date(c.createdAt).toLocaleDateString()} {new Date(c.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                          <p className="text-slate-600 leading-relaxed font-sans mt-1 pl-6 whitespace-pre-wrap">{c.text}</p>
                        </div>
                      );
                    })
                  )}
                </div>

                {/* Post comment form */}
                <form onSubmit={handlePostComment} className="flex gap-2.5 items-end">
                  <div className="flex-grow space-y-1">
                    <input
                      type="text"
                      required
                      value={activeCommentText}
                      onChange={(e) => setActiveCommentText(e.target.value)}
                      placeholder="Add comment... Use @Bob Johnson to mention and notify"
                      className="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg px-3.5 py-2.5 focus:border-indigo-500 outline-none text-slate-800 text-sans font-medium"
                    />
                  </div>
                  <button
                    type="submit"
                    className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold px-4 py-2.5 rounded-lg shrink-0 cursor-pointer"
                  >
                    Discuss
                  </button>
                </form>
              </div>
            </div>

            {/* Footer */}
            <div className="border-t border-slate-100 p-4.5 bg-slate-50 rounded-b-2xl flex justify-between items-center text-xs select-none">
              <span className="text-[10px] uppercase font-mono tracking-wide text-slate-400">Card-ID: {selectedTask.id}</span>
              <button
                onClick={() => setSelectedTaskId(null)}
                className="px-4 py-2 bg-slate-200 text-slate-700 rounded-lg hover:bg-slate-300 font-bold cursor-pointer"
              >
                Close View
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}
