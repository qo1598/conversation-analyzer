'use client'

import { useState } from 'react'

export default function TranscriptView({ transcript, speakers }) {
    const [selectedSpeaker, setSelectedSpeaker] = useState('all')

    const filteredTranscript = selectedSpeaker === 'all'
        ? transcript
        : transcript.filter(item => item.speaker === selectedSpeaker)

    // 시간 포맷팅 (MM:SS)
    const formatTime = (seconds) => {
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    }

    return (
        <div className="h-full flex flex-col">
            {/* 필터 헤더 */}
            <div className="flex justify-between items-center mb-6 sticky top-0 bg-white/80 backdrop-blur-sm p-4 rounded-xl border border-gray-100 shadow-sm z-10 transition-all">
                <h3 className="font-bold text-gray-800 text-lg">대화 기록 ({filteredTranscript.length})</h3>
                <div className="relative">
                    <select
                        value={selectedSpeaker}
                        onChange={(e) => setSelectedSpeaker(e.target.value)}
                        className="appearance-none bg-indigo-50 border border-indigo-100 text-gray-700 py-2 px-4 pr-8 rounded-lg text-sm font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer hover:bg-indigo-100 transition-colors"
                    >
                        <option value="all">전체 참여자</option>
                        {speakers && Object.entries(speakers).map(([id, info]) => (
                            <option key={id} value={id}>{info.name}</option>
                        ))}
                    </select>
                    <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-indigo-500">
                        <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z" /></svg>
                    </div>
                </div>
            </div>

            {/* 대화 리스트 */}
            <div className="space-y-6 px-2">
                {filteredTranscript.length > 0 ? (
                    filteredTranscript.map((item, index) => {
                        const speakerInfo = speakers?.[item.speaker];
                        const isMe = false; // 나중에 '나'를 구분할 수 있다면 활용 가능

                        return (
                            <div key={index} className={`flex gap-4 ${isMe ? 'flex-row-reverse' : ''}`}>
                                {/* 아바타 */}
                                <div
                                    className="w-10 h-10 rounded-full flex-shrink-0 flex items-center justify-center text-white font-bold shadow-sm"
                                    style={{ backgroundColor: speakerInfo?.color || '#94a3b8' }}
                                >
                                    {speakerInfo?.name?.charAt(0) || '?'}
                                </div>

                                {/* 말풍선 내용 */}
                                <div className={`flex flex-col max-w-[80%] ${isMe ? 'items-end' : 'items-start'}`}>
                                    <div className="flex items-baseline gap-2 mb-1">
                                        <span className="font-bold text-sm text-gray-700">
                                            {speakerInfo?.name || `화자 ${item.speaker}`}
                                        </span>
                                        <span className="text-xs text-gray-400 font-mono">
                                            {formatTime(item.start)}
                                        </span>
                                    </div>

                                    <div className={`p-4 rounded-2xl shadow-sm text-gray-700 leading-relaxed bg-white border border-gray-100 ${isMe ? 'bg-indigo-50 border-indigo-100' : ''}`}>
                                        {item.text}
                                    </div>
                                </div>
                            </div>
                        )
                    })
                ) : (
                    <div className="flex flex-col items-center justify-center py-20 text-gray-400">
                        <div className="text-5xl mb-4 opacity-20">💬</div>
                        <p>대화 내용이 없습니다.</p>
                    </div>
                )}
            </div>
        </div>
    )
}
