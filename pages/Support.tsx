import React, { useState, useEffect, useRef } from 'react';
import TgCard from '../components/TgCard';
import SectionHeader from '../components/SectionHeader';
import Badge from '../components/Badge';
import Modal from '../components/Modal';
import { SupportTicket } from '../types';

export interface ExtendedTicket extends SupportTicket {
    messages?: { sender: 'user' | 'admin', text: string, date: string }[];
}

interface SupportProps {
  tickets: ExtendedTicket[];
  onCreateTicket: (subject: string, message: string, category: string) => void;
}

const Support: React.FC<SupportProps> = ({ tickets, onCreateTicket }) => {
    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [selectedTicket, setSelectedTicket] = useState<ExtendedTicket | null>(null);
    const [chatInput, setChatInput] = useState("");
    const [localTickets, setLocalTickets] = useState<ExtendedTicket[]>(tickets);

    useEffect(() => {
        setLocalTickets(tickets.map(t => ({...t, messages: t.messages || []})));
    }, [tickets]);

    // New Ticket State
    const [newSubject, setNewSubject] = useState("");
    const [newMessage, setNewMessage] = useState("");
    const [newCategory, setNewCategory] = useState("connection");
    
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        scrollToBottom();
    }, [selectedTicket?.messages, selectedTicket?.reply]);

    const handleSubmit = () => {
        if (!newSubject.trim() || !newMessage.trim()) return;
        onCreateTicket(newSubject, newMessage, newCategory);
        setIsCreateOpen(false);
        setNewSubject("");
        setNewMessage("");
        setNewCategory("connection");
    };

    const handleSendMessage = () => {
        if (!chatInput.trim() || !selectedTicket) return;
        
        const newMessageObj = { sender: 'user' as const, text: chatInput, date: new Date().toLocaleTimeString('ru-RU', {hour: '2-digit', minute:'2-digit'}) };
        
        // Update local tickets state
        const updatedTickets = localTickets.map(t => {
            if (t.id === selectedTicket.id) {
                return { 
                    ...t, 
                    messages: [...(t.messages || []), newMessageObj] 
                };
            }
            return t;
        });
        
        setLocalTickets(updatedTickets);
        // Also update the currently selected ticket reference to reflect changes immediately
        setSelectedTicket(prev => prev ? ({ ...prev, messages: [...(prev.messages || []), newMessageObj] }) : null);
        
        setChatInput("");
    };

    return (
        <div className="pt-4 px-4 w-full">
             <div className="flex justify-between items-center mb-6">
                 <div>
                    <h2 className="text-2xl font-bold text-tg-text">Поддержка</h2>
                    <p className="text-sm text-tg-hint">Мы ответим в течение 24 часов</p>
                 </div>
                 <button 
                    onClick={() => setIsCreateOpen(true)}
                    className="bg-tg-blue text-white w-10 h-10 rounded-full flex items-center justify-center shadow-lg shadow-tg-blue/20 active:scale-90 transition-transform hover:bg-opacity-90"
                 >
                     <i className="fas fa-plus"></i>
                 </button>
             </div>

             <SectionHeader title="Мои тикеты" />
             {localTickets.length === 0 ? (
                 <TgCard className="p-8 text-center">
                     <i className="fas fa-inbox text-4xl text-tg-separator mb-3"></i>
                     <p className="text-tg-hint text-sm">У вас пока нет открытых тикетов</p>
                 </TgCard>
             ) : (
                 <div className="flex flex-col gap-3">
                     {localTickets.map(ticket => (
                         <TgCard 
                            key={ticket.id} 
                            onClick={() => setSelectedTicket(ticket)}
                            className="cursor-pointer hover:bg-tg-hover transition-colors"
                         >
                             <div className="p-4">
                                 <div className="flex justify-between items-start mb-2">
                                     <span className="font-semibold text-tg-text text-[15px] truncate mr-2">{ticket.subject}</span>
                                     <Badge 
                                        color={ticket.status === 'open' ? 'green' : ticket.status === 'answered' ? 'blue' : 'gray'} 
                                        text={ticket.status === 'open' ? 'Открыт' : ticket.status === 'answered' ? 'Ответ' : 'Закрыт'}
                                     />
                                 </div>
                                 <p className="text-sm text-tg-hint line-clamp-2 mb-3 h-10">{ticket.message}</p>
                                 <div className="flex justify-between items-center text-xs text-tg-hint border-t border-tg-separator pt-2 mt-2">
                                    <span>#{ticket.id}</span>
                                    <span>{ticket.date}</span>
                                 </div>
                             </div>
                         </TgCard>
                     ))}
                 </div>
             )}
            
            {/* Ticket Detail Modal (Interactive Chat View) */}
            <Modal isOpen={!!selectedTicket} onClose={() => setSelectedTicket(null)} title={`Тикет #${selectedTicket?.id}`}>
                 {selectedTicket && (
                     <div className="flex flex-col h-[70vh] sm:h-[60vh]">
                         <div className="flex-1 overflow-y-auto pr-1 space-y-4 pb-4">
                             <div className="bg-tg-bg p-3 rounded-lg border border-tg-separator mb-4 sticky top-0 z-10 shadow-sm">
                                 <div className="text-xs text-tg-hint uppercase font-bold mb-1">Тема</div>
                                 <div className="text-tg-text font-medium">{selectedTicket.subject}</div>
                             </div>

                             {/* Initial Message */}
                             <div className="flex justify-end">
                                 <div className="bg-tg-blue text-white rounded-2xl rounded-tr-none py-2 px-4 max-w-[85%] shadow-sm">
                                     <p className="text-sm">{selectedTicket.message}</p>
                                     <div className="text-[10px] text-white/70 text-right mt-1">{selectedTicket.date}</div>
                                 </div>
                             </div>

                             {/* Admin Reply (Legacy support) */}
                             {selectedTicket.reply && (
                                <div className="flex justify-start">
                                    <div className="bg-tg-hover text-tg-text rounded-2xl rounded-tl-none py-2 px-4 max-w-[85%] border border-tg-separator">
                                        <p className="text-xs text-tg-blue font-bold mb-1">Поддержка</p>
                                        <p className="text-sm">{selectedTicket.reply}</p>
                                        <div className="text-[10px] text-tg-hint mt-1 text-right">Admin</div>
                                    </div>
                                </div>
                             )}

                             {/* Dynamic Messages */}
                             {selectedTicket.messages?.map((msg, idx) => (
                                 <div key={idx} className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                                     <div className={`rounded-2xl py-2 px-4 max-w-[85%] shadow-sm ${
                                         msg.sender === 'user' 
                                            ? 'bg-tg-blue text-white rounded-tr-none' 
                                            : 'bg-tg-hover text-tg-text rounded-tl-none border border-tg-separator'
                                     }`}>
                                         {msg.sender === 'admin' && <p className="text-xs text-tg-blue font-bold mb-1">Поддержка</p>}
                                         <p className="text-sm">{msg.text}</p>
                                         <div className={`text-[10px] mt-1 ${msg.sender === 'user' ? 'text-white/70 text-right' : 'text-tg-hint'}`}>
                                             {msg.date}
                                         </div>
                                     </div>
                                 </div>
                             ))}
                             
                             <div ref={messagesEndRef} />
                         </div>

                         {/* Chat Input Area */}
                         {selectedTicket.status !== 'closed' && (
                            <div className="pt-2 border-t border-tg-separator">
                                <div className="flex items-center gap-2">
                                    <input 
                                        type="text" 
                                        value={chatInput}
                                        onChange={(e) => setChatInput(e.target.value)}
                                        onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                                        placeholder="Напишите сообщение..." 
                                        className="flex-1 bg-tg-bg border border-tg-separator rounded-full px-4 py-2.5 text-sm text-tg-text focus:outline-none focus:border-tg-blue transition-colors"
                                    />
                                    <button 
                                        onClick={handleSendMessage}
                                        disabled={!chatInput.trim()}
                                        className={`w-10 h-10 rounded-full flex items-center justify-center transition-colors ${
                                            chatInput.trim() ? 'bg-tg-blue text-white hover:bg-opacity-90' : 'bg-tg-separator text-tg-hint'
                                        }`}
                                    >
                                        <i className="fas fa-paper-plane text-sm"></i>
                                    </button>
                                </div>
                            </div>
                         )}
                     </div>
                 )}
            </Modal>

            {/* Create Ticket Modal */}
            <Modal isOpen={isCreateOpen} onClose={() => setIsCreateOpen(false)} title="Новый тикет">
                 <div className="space-y-4 pt-2">
                     <div>
                         <label className="block text-xs text-tg-hint uppercase font-bold mb-1.5">Категория</label>
                         <div className="flex bg-tg-bg rounded-lg p-1 border border-tg-separator">
                             {['connection', 'payment', 'other'].map((cat) => (
                                 <button 
                                    key={cat}
                                    onClick={() => setNewCategory(cat)}
                                    className={`flex-1 py-2 text-xs font-medium rounded transition-colors ${
                                        newCategory === cat ? 'bg-tg-blue text-white shadow' : 'text-tg-hint hover:text-tg-text'
                                    }`}
                                 >
                                     {cat === 'connection' ? 'Связь' : cat === 'payment' ? 'Оплата' : 'Другое'}
                                 </button>
                             ))}
                         </div>
                     </div>
                     <div>
                         <label className="block text-xs text-tg-hint uppercase font-bold mb-1.5">Тема</label>
                         <input 
                            type="text" 
                            className="w-full bg-tg-bg border border-tg-separator rounded-xl p-3 text-[15px] text-tg-text focus:outline-none focus:border-tg-blue"
                            placeholder="Краткая суть проблемы"
                            value={newSubject}
                            onChange={(e) => setNewSubject(e.target.value)}
                         />
                     </div>
                     <div>
                         <label className="block text-xs text-tg-hint uppercase font-bold mb-1.5">Сообщение</label>
                         <textarea 
                            className="w-full bg-tg-bg border border-tg-separator rounded-xl p-3 text-[15px] text-tg-text focus:outline-none focus:border-tg-blue placeholder-tg-hint resize-none"
                            placeholder="Подробно опишите ситуацию..."
                            rows={4}
                            value={newMessage}
                            onChange={(e) => setNewMessage(e.target.value)}
                         />
                     </div>
                     <button 
                        onClick={handleSubmit}
                        disabled={!newSubject || !newMessage}
                        className={`w-full py-3.5 rounded-xl font-semibold flex items-center justify-center transition-all ${
                            !newSubject || !newMessage ? 'bg-tg-separator text-tg-hint' : 'bg-tg-blue text-white active:scale-95 shadow-lg shadow-tg-blue/20'
                        }`}
                    >
                        Создать тикет
                    </button>
                 </div>
            </Modal>
        </div>
    );
};

export default Support;