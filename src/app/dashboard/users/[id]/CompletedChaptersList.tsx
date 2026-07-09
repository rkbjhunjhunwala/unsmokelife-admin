'use client';

import { useState } from 'react';

interface CompletedChaptersListProps {
  chapters: { id: string; [key: string]: any }[];
}

export default function CompletedChaptersList({ chapters }: CompletedChaptersListProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  if (chapters.length === 0) {
    return <p className="text-sm text-slate-500 italic">No chapters completed yet.</p>;
  }

  const toggleExpand = (id: string) => {
    setExpandedId(expandedId === id ? null : id);
  };

  const formatDate = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleString('en-US', {
        dateStyle: 'medium',
        timeStyle: 'short'
      });
    } catch {
      return dateString;
    }
  };

  const renderValue = (key: string, value: any) => {
    // 1. Handle Empty states
    if (value === null || value === undefined || value === '') {
      return <span className="text-slate-400 italic text-sm">None</span>;
    }

    // 2. Handle Date
    if (key === 'completedAt') {
      return <span className="text-slate-800 font-medium">{formatDate(String(value))}</span>;
    }

    // 3. EXCEPTION: Quiz Results (Calculates Score and Maps Correct/Incorrect)
    if (key === 'quizResults') {
      // Ensure we are working with an array
      let quizArray = Array.isArray(value) ? value : [];
      if (typeof value === 'string') {
        try { quizArray = JSON.parse(value); } catch (e) { quizArray = []; }
      }

      if (quizArray.length === 0) return <span className="text-slate-400 italic text-sm">No data</span>;

      // Safely parse each item in case they are stringified JSON strings inside the array
      const parsedQuiz = quizArray.map(item => {
        if (typeof item === 'string') {
          try { return JSON.parse(item); } catch (e) { return null; }
        }
        return item;
      }).filter(Boolean); // removes any nulls

      // Calculate total score
      const totalQuestions = parsedQuiz.length;
      const correctAnswers = parsedQuiz.filter(q => q.isCorrect).length;
      const scorePercentage = Math.round((correctAnswers / totalQuestions) * 100);

      // Determine color based on score
      const scoreColor = scorePercentage >= 80 
        ? 'bg-emerald-100 text-emerald-800 border-emerald-200' 
        : scorePercentage >= 50 
          ? 'bg-amber-100 text-amber-800 border-amber-200' 
          : 'bg-rose-100 text-rose-800 border-rose-200';

      return (
        <div className="mt-3 w-full">
          {/* Score Summary Box */}
          <div className={`mb-4 flex items-center justify-between p-3 rounded-lg border shadow-sm ${scoreColor}`}>
            <span className="font-bold text-sm uppercase tracking-wider">Total Score</span>
            <span className="font-bold text-lg">
              {correctAnswers} / {totalQuestions} <span className="text-sm opacity-80 font-semibold">({scorePercentage}%)</span>
            </span>
          </div>

          {/* Individual Questions */}
          <div className="space-y-3">
            {parsedQuiz.map((item, idx) => {
              const isCorrect = item.isCorrect;
              // Add 1 because arrays are 0-indexed, but humans read Option 1, 2, 3
              const userOpt = Number(item.userAnswerIndex) + 1;
              const correctOpt = Number(item.correctAnswerIndex) + 1;

              return (
                <div key={idx} className={`p-4 rounded-lg border-l-4 shadow-sm ${isCorrect ? 'bg-emerald-50/50 border-emerald-400' : 'bg-rose-50/50 border-rose-400'}`}>
                  <div className="flex gap-3">
                    <div className="mt-0.5 text-lg flex-shrink-0">
                      {isCorrect ? '✅' : '❌'}
                    </div>
                    <div className="w-full">
                      <div className="text-sm font-semibold text-slate-800 mb-3">
                        {item.question || `Question ${idx + 1}`}
                      </div>
                      
                      {/* Answer Comparison Grid */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                        {/* User's Answer */}
                        <div className={`p-2 rounded border ${isCorrect ? 'bg-emerald-100/50 border-emerald-200 text-emerald-900' : 'bg-rose-100/50 border-rose-200 text-rose-900'}`}>
                          <span className="font-bold block mb-1 opacity-70 uppercase text-[10px] tracking-wider">User Answer</span>
                          <span className="font-semibold text-sm">Option {userOpt}</span>
                        </div>
                        
                        {/* Correct Answer (Only shows if user got it wrong) */}
                        {!isCorrect && (
                          <div className="p-2 rounded border bg-emerald-100/50 border-emerald-200 text-emerald-900">
                            <span className="font-bold block mb-1 opacity-70 uppercase text-[10px] tracking-wider">Correct Answer</span>
                            <span className="font-semibold text-sm">Option {correctOpt}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      );
    }

    // 4. Handle Standard Arrays
    if (Array.isArray(value)) {
      if (value.length === 0) return <span className="text-slate-400 italic text-sm">No data</span>;
      return (
        <ul className="list-disc list-inside text-slate-700 mt-1 space-y-1">
          {value.map((val, idx) => (
            <li key={idx} className="text-sm">
              {typeof val === 'object' ? JSON.stringify(val) : String(val)}
            </li>
          ))}
        </ul>
      );
    }

    // 5. Handle Objects (like writtenAnswers, multiSelections)
    if (typeof value === 'object') {
      const keys = Object.keys(value);
      if (keys.length === 0) return <span className="text-slate-400 italic text-sm">No data</span>;
      
      return (
        <div className="mt-2 space-y-3 bg-slate-50 p-4 rounded-lg border border-slate-200 w-full">
          {keys.map((k) => (
            <div key={k} className="border-l-4 border-indigo-300 pl-3 py-1">
              <div className="text-xs font-bold text-slate-500 capitalize tracking-wide">
                {k.replace(/_/g, ' ')}
              </div>
              <div className="text-sm text-slate-900 mt-1 font-medium">
                {String(value[k])}
              </div>
            </div>
          ))}
        </div>
      );
    }

    // 6. Handle Primitives
    return <span className="text-slate-800 font-medium">{String(value)}</span>;
  };

  return (
    <ul className="space-y-3">
      {chapters.map((chapter) => {
        const isExpanded = expandedId === chapter.id;
        
        return (
          <li key={chapter.id} className="bg-slate-50 rounded-xl border border-slate-200 overflow-hidden shadow-sm">
            <button 
              onClick={() => toggleExpand(chapter.id)}
              className="w-full flex items-center justify-between p-4 text-left hover:bg-slate-100 transition-colors"
            >
              <div className="flex items-center text-sm font-medium text-slate-700">
                <span className="mr-3 text-green-600 bg-green-100 rounded-full w-6 h-6 flex items-center justify-center text-xs shadow-sm">✓</span>
                <span className="capitalize text-base font-semibold text-slate-800">
                  {chapter.id.replace(/_/g, ' ')}
                </span>
              </div>
              <span className="text-slate-500 text-xs font-semibold bg-white px-3 py-1.5 rounded-lg border border-slate-200 shadow-sm">
                {isExpanded ? 'Hide Details ▲' : 'View Details ▼'}
              </span>
            </button>

            {isExpanded && (
              <div className="p-5 bg-white border-t border-slate-200">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-6 gap-x-6 text-sm">
                  {Object.entries(chapter).map(([key, value]) => {
                    if (key === 'id') return null; 
                    
                    const isComplexData = (typeof value === 'object' && value !== null) || key === 'quizResults';
                    
                    return (
                      <div key={key} className={`flex flex-col ${isComplexData ? 'sm:col-span-2' : ''}`}>
                        <span className="text-[11px] uppercase text-slate-400 font-bold tracking-widest mb-1">
                          {key.replace(/([A-Z])/g, ' $1').trim()}
                        </span>
                        {renderValue(key, value)}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </li>
        );
      })}
    </ul>
  );
}