'use client';
import React, { useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import {
  ArrowLeft, Search, MessageCircle, Send, ThumbsUp,
  ChevronDown, User, Clock, CheckCircle,
} from 'lucide-react';

const QUESTIONS = [
  {
    id: 'q-1',
    question: 'Is there a free airport shuttle available?',
    askedBy: 'Michael R.', date: 'Jun 8, 2026', votes: 15,
    answers: [
      { id: 'a-1', text: 'Yes, we offer a complimentary airport shuttle every 30 minutes from 6 AM to midnight. Please provide your flight details at the time of booking so we can arrange your pickup.', by: 'Hotel Management', date: 'Jun 9, 2026', isOfficial: true },
    ],
  },
  {
    id: 'q-2',
    question: 'What time is breakfast served and is it included in the room rate?',
    askedBy: 'Priya S.', date: 'Jun 5, 2026', votes: 22,
    answers: [
      { id: 'a-2', text: 'Breakfast is served from 6:30 AM to 10:30 AM on weekdays and 7:00 AM to 11:00 AM on weekends. It is included in select rate plans. Please check your booking details or contact us to add breakfast to your reservation.', by: 'Hotel Management', date: 'Jun 6, 2026', isOfficial: true },
    ],
  },
  {
    id: 'q-3',
    question: 'Is the swimming pool heated? Can children use it?',
    askedBy: 'James L.', date: 'Jun 2, 2026', votes: 11,
    answers: [
      { id: 'a-3', text: 'Our outdoor pool is temperature-controlled and maintained at 28°C year-round. Children are welcome and must be accompanied by an adult. We also have a separate kids pool area with shallow depth.', by: 'Hotel Management', date: 'Jun 3, 2026', isOfficial: true },
      { id: 'a-4', text: 'We visited with our kids last month — the pool was great! The kids pool is perfect for toddlers and the main pool has a lovely infinity edge.', by: 'Sarah K.', date: 'Jun 4, 2026', isOfficial: false },
    ],
  },
  {
    id: 'q-4',
    question: 'Do you have parking? Is it free or charged?',
    askedBy: 'Omar A.', date: 'May 28, 2026', votes: 8,
    answers: [
      { id: 'a-5', text: 'We offer complimentary self-parking and valet parking at AED 50 per night. Electric vehicle charging stations are also available in the underground parking area.', by: 'Hotel Management', date: 'May 29, 2026', isOfficial: true },
    ],
  },
  {
    id: 'q-5',
    question: 'What is the cancellation policy for the non-refundable rate?',
    askedBy: 'Fatima H.', date: 'May 25, 2026', votes: 19,
    answers: [
      { id: 'a-6', text: 'Non-refundable bookings cannot be cancelled or modified once confirmed. We recommend our flexible rate plans if you need the option to change your plans. Flexible rates offer free cancellation up to 24 hours before check-in.', by: 'Hotel Management', date: 'May 26, 2026', isOfficial: true },
    ],
  },
  {
    id: 'q-6',
    question: 'Is there a spa or wellness center? What treatments are available?',
    askedBy: 'Emily W.', date: 'May 20, 2026', votes: 14,
    answers: [
      { id: 'a-7', text: 'Yes, our full-service spa offers a wide range of treatments including Swedish massage, hot stone therapy, facial treatments, body wraps, and aromatherapy. We recommend booking in advance, especially on weekends. Spa hours are 9 AM to 10 PM daily.', by: 'Hotel Management', date: 'May 21, 2026', isOfficial: true },
    ],
  },
];

export default function QuestionsPage() {
  const { hotelId } = useParams();
  const [searchQuery, setSearchQuery] = useState('');
  const [showAskForm, setShowAskForm] = useState(false);
  const [newQuestion, setNewQuestion] = useState('');

  const filtered = searchQuery
    ? QUESTIONS.filter(q =>
        q.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
        q.answers.some(a => a.text.toLowerCase().includes(searchQuery.toLowerCase()))
      )
    : QUESTIONS;

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200 px-4 py-3">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href={`/hotel/${hotelId}`} className="w-9 h-9 bg-slate-100 hover:bg-slate-200 rounded-xl flex items-center justify-center transition-colors">
              <ArrowLeft className="w-4 h-4" />
            </Link>
            <div>
              <h1 className="text-lg font-bold text-slate-900">Questions & Answers</h1>
              <p className="text-xs text-slate-500">{QUESTIONS.length} questions answered</p>
            </div>
          </div>
          <button
            onClick={() => setShowAskForm(true)}
            className="bg-rose-600 text-white text-sm font-bold px-4 py-2 rounded-xl hover:bg-rose-700 transition-colors"
          >
            Ask a Question
          </button>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
        {/* Search */}
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-4 top-3.5" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search questions..."
            className="w-full bg-white border border-slate-200 pl-11 pr-4 py-3 rounded-xl text-sm outline-none focus:ring-2 focus:ring-rose-500 focus:border-transparent transition-all"
          />
        </div>

        {/* Ask Form */}
        {showAskForm && (
          <div className="bg-white rounded-2xl border border-rose-200 shadow-sm p-5">
            <h3 className="font-bold text-slate-900 mb-3">Ask the Hotel</h3>
            <textarea
              value={newQuestion}
              onChange={e => setNewQuestion(e.target.value)}
              placeholder="Type your question here..."
              rows={3}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-rose-500 focus:border-transparent resize-none transition-all"
            />
            <div className="flex items-center justify-between mt-3">
              <p className="text-[10px] text-slate-400">Your question will be reviewed before publishing. Do not share personal contact information.</p>
              <div className="flex gap-2">
                <button
                  onClick={() => { setShowAskForm(false); setNewQuestion(''); }}
                  className="px-4 py-2 rounded-xl text-sm font-medium text-slate-600 hover:bg-slate-100 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={() => { setShowAskForm(false); setNewQuestion(''); }}
                  className="bg-rose-600 text-white text-sm font-bold px-4 py-2 rounded-xl hover:bg-rose-700 transition-colors flex items-center gap-2"
                >
                  <Send className="w-3.5 h-3.5" /> Submit
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Questions List */}
        <div className="space-y-4">
          {filtered.map(q => (
            <div key={q.id} className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
              {/* Question */}
              <div className="p-5">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 bg-rose-50 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5">
                    <MessageCircle className="w-4 h-4 text-rose-500" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-bold text-slate-900 text-sm mb-1">{q.question}</h3>
                    <div className="flex items-center gap-3 text-[11px] text-slate-400">
                      <span className="flex items-center gap-1"><User className="w-3 h-3" /> {q.askedBy}</span>
                      <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {q.date}</span>
                    </div>
                  </div>
                  <button className="flex items-center gap-1 text-xs text-slate-400 hover:text-rose-500 transition-colors px-2 py-1 rounded-lg hover:bg-rose-50" aria-label="Like">
                    <ThumbsUp className="w-3 h-3" /> {q.votes}
                  </button>
                </div>
              </div>

              {/* Answers */}
              <div className="border-t border-slate-50">
                {q.answers.map(answer => (
                  <div key={answer.id} className={`px-5 py-4 ${answer.isOfficial ? 'bg-slate-50' : 'bg-white'} border-b border-slate-50 last:border-b-0`}>
                    <div className="flex items-start gap-3 ml-8">
                      <div className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 ${answer.isOfficial ? 'bg-emerald-100' : 'bg-slate-100'}`}>
                        {answer.isOfficial ? <CheckCircle className="w-3.5 h-3.5 text-emerald-600" /> : <User className="w-3 h-3 text-slate-400" />}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xs font-bold text-slate-700">{answer.by}</span>
                          {answer.isOfficial && (
                            <span className="bg-emerald-50 text-emerald-700 text-[9px] font-bold px-1.5 py-0.5 rounded">Official</span>
                          )}
                          <span className="text-[10px] text-slate-400">{answer.date}</span>
                        </div>
                        <p className="text-sm text-slate-600 leading-relaxed">{answer.text}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Empty State */}
        {filtered.length === 0 && (
          <div className="text-center py-16">
            <MessageCircle className="w-12 h-12 text-slate-200 mx-auto mb-4" />
            <p className="text-slate-500 font-medium">No questions found</p>
            <p className="text-sm text-slate-400 mt-1">Try a different search or ask a new question</p>
          </div>
        )}
      </div>
    </div>
  );
}
