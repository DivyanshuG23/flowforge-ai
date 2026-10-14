import React, { useState } from 'react';
import { 
  Zap, 
  Activity, 
  GitBranch, 
  Sparkles, 
  Globe, 
  Send,
  GripVertical,
  Plus,
  HelpCircle,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';

const availableNodes = [
  {
    type: 'trigger',
    label: 'Trigger',
    description: 'Webhook, schedule, or manual trigger',
    icon: Zap,
    color: 'text-[#E5B45B]',
    border: 'border-[rgba(229,180,91,0.3)]',
    badge: 'ENTRY',
  },
  {
    type: 'action',
    label: 'Action',
    description: 'Transform data or run code block',
    icon: Activity,
    color: 'text-[#F5F0E6]',
    border: 'border-[rgba(185,176,160,0.2)]',
    badge: 'PROCESS',
  },
  {
    type: 'condition',
    label: 'Condition',
    description: 'If/Else logic with True & False branches',
    icon: GitBranch,
    color: 'text-[#059669]',
    border: 'border-[#059669]/30',
    badge: 'LOGIC',
  },
  {
    type: 'ai',
    label: 'AI Agent',
    description: 'Autonomous LLM reasoning & auto-healing',
    icon: Sparkles,
    color: 'text-[#E5B45B]',
    border: 'border-[rgba(229,180,91,0.35)]',
    badge: 'INTELLIGENCE',
  },
  {
    type: 'api',
    label: 'API Request',
    description: 'HTTP REST, GraphQL, or webhook call',
    icon: Globe,
    color: 'text-[#E5B45B]',
    border: 'border-[rgba(185,176,160,0.2)]',
    badge: 'NETWORK',
  },
  {
    type: 'output',
    label: 'Output',
    description: 'Commit result, notify, or dispatch response',
    icon: Send,
    color: 'text-[#059669]',
    border: 'border-[#059669]/30',
    badge: 'TERMINAL',
  },
];

export default function NodeSidebar({ onAddNode, isCollapsed, onToggleCollapse }) {
  const onDragStart = (event, nodeType) => {
    event.dataTransfer.setData('application/reactflow', nodeType);
    event.dataTransfer.effectAllowed = 'move';
  };

  return (
    <aside
      className={`relative z-20 bg-[#0B0D0C] border-r border-[rgba(185,176,160,0.12)] flex flex-col transition-all duration-300 ${
        isCollapsed ? 'w-14' : 'w-72'
      }`}
    >
      {/* Header */}
      <div className="h-14 px-4 flex items-center justify-between border-b border-[rgba(185,176,160,0.08)] bg-[#0B0D0C]">
        {!isCollapsed && (
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-[#F5F0E6]">
              Node Library
            </h3>
            <span className="text-[10px] text-[#B9B0A0] block">
              Drag or click to add
            </span>
          </div>
        )}

        <button
          onClick={onToggleCollapse}
          className="p-1 rounded-lg text-[#B9B0A0] hover:text-[#F5F0E6] hover:bg-[#151715] transition-colors mx-auto"
          title={isCollapsed ? 'Expand node library' : 'Collapse node library'}
        >
          {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>
      </div>

      {/* Node list */}
      <div className="flex-1 p-3 space-y-2.5 overflow-y-auto">
        {availableNodes.map((item) => {
          const Icon = item.icon;
          return (
            <div
              key={item.type}
              draggable
              onDragStart={(e) => onDragStart(e, item.type)}
              onClick={() => onAddNode(item.type)}
              className={`group cursor-grab active:cursor-grabbing p-3 rounded-xl bg-[#151715] border border-[rgba(185,176,160,0.12)] hover:border-[#E5B45B]/40 hover:shadow-glow-gold transition-all duration-200 ${
                isCollapsed ? 'flex justify-center p-2.5' : ''
              }`}
              title={isCollapsed ? `${item.label} (${item.description})` : undefined}
            >
              {isCollapsed ? (
                <div className="w-8 h-8 rounded-lg bg-[#252419] border border-[rgba(229,180,91,0.25)] flex items-center justify-center text-[#E5B45B] group-hover:scale-105 transition-transform">
                  <Icon className="w-4 h-4" />
                </div>
              ) : (
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2.5">
                      <div className="w-7 h-7 rounded-lg bg-[#252419] border border-[rgba(229,180,91,0.25)] flex items-center justify-center text-[#E5B45B] group-hover:scale-105 transition-transform">
                        <Icon className="w-3.5 h-3.5" />
                      </div>
                      <span className="text-xs font-bold text-[#F5F0E6] group-hover:text-[#E5B45B] transition-colors">
                        {item.label}
                      </span>
                    </div>

                    <div className="flex items-center space-x-1">
                      <span className="text-[9px] font-semibold tracking-wider uppercase px-1.5 py-0.5 rounded bg-[#0B0D0C] text-[#B9B0A0] border border-[rgba(185,176,160,0.1)]">
                        {item.badge}
                      </span>
                      <GripVertical className="w-3.5 h-3.5 text-[#B9B0A0]/40 group-hover:text-[#E5B45B] transition-colors" />
                    </div>
                  </div>

                  <p className="text-[11px] text-[#B9B0A0] leading-snug pl-9">
                    {item.description}
                  </p>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Tip footer */}
      {!isCollapsed && (
        <div className="p-3 border-t border-[rgba(185,176,160,0.08)] bg-[#0B0D0C]">
          <div className="p-2.5 rounded-xl bg-[#151715] border border-[rgba(185,176,160,0.08)] flex items-start space-x-2 text-[10px] text-[#B9B0A0]">
            <HelpCircle className="w-3.5 h-3.5 text-[#E5B45B] flex-shrink-0 mt-0.5" />
            <p>
              Drag nodes onto the canvas or click to add them directly to your pipeline flow.
            </p>
          </div>
        </div>
      )}
    </aside>
  );
}
