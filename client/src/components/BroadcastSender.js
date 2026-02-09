import React from 'react';
import { Radio, Send, Clock, AlertCircle } from 'lucide-react';

const BroadcastSender = ({ broadcastNumbers, setBroadcastNumbers, broadcastMessage, setBroadcastMessage, activeConnection, isBroadcasting, onBroadcastMessage, broadcastDelay, setBroadcastDelay }) => {
    return (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden font-sans max-w-4xl mx-auto">
            <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-gray-50/30">
                <div className="flex items-center">
                    <div className="p-2 bg-purple-100 text-purple-600 rounded-lg mr-3">
                        <Radio className="w-5 h-5" />
                    </div>
                    <div>
                        <h2 className="text-lg font-bold text-gray-800">Broadcast Messages</h2>
                        <p className="text-xs text-gray-500">Send bulk messages to multiple contacts</p>
                    </div>
                </div>
            </div>

            <form onSubmit={onBroadcastMessage} className="p-8 space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    {/* Left Column: Input Numbers */}
                    <div>
                        <label htmlFor="broadcast-numbers" className="block text-sm font-semibold text-gray-700 mb-2">
                            Recipient Numbers <span className="text-gray-400 font-normal">(One per line)</span>
                        </label>
                        <textarea
                            id="broadcast-numbers"
                            rows="12"
                            value={broadcastNumbers}
                            onChange={(e) => setBroadcastNumbers(e.target.value)}
                            placeholder="6281234567890&#10;6289876543210&#10;628111222333"
                            className="block w-full px-4 py-3 rounded-xl border-gray-200 bg-gray-50 text-gray-900 focus:bg-white focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 transition-all font-mono text-sm shadow-sm"
                            disabled={activeConnection?.status !== 'connected'}
                        />
                        <div className="mt-2 text-xs text-gray-500 flex justify-between">
                            <span>Supported: International format (62...)</span>
                            <span>{broadcastNumbers ? broadcastNumbers.split('\n').filter(n => n.trim()).length : 0} numbers</span>
                        </div>
                    </div>

                    {/* Right Column: Message & Config */}
                    <div className="space-y-6">
                        <div>
                            <label htmlFor="broadcast-message" className="block text-sm font-semibold text-gray-700 mb-2">Message Content</label>
                            <textarea
                                id="broadcast-message"
                                rows="6"
                                value={broadcastMessage}
                                onChange={(e) => setBroadcastMessage(e.target.value)}
                                placeholder="Type your broadcast message..."
                                className="block w-full px-4 py-3 rounded-xl border-gray-200 bg-gray-50 text-gray-900 focus:bg-white focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 transition-all resize-none shadow-sm"
                                disabled={activeConnection?.status !== 'connected'}
                            />
                        </div>

                        <div>
                            <label htmlFor="broadcast-delay" className="block text-sm font-semibold text-gray-700 mb-2">
                                Delay Interval <span className="text-gray-400 font-normal">(ms)</span>
                            </label>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <Clock className="h-5 w-5 text-gray-400" />
                                </div>
                                <input
                                    type="number"
                                    id="broadcast-delay"
                                    value={broadcastDelay}
                                    onChange={(e) => setBroadcastDelay(Number(e.target.value))}
                                    min="500"
                                    step="100"
                                    className="block w-full pl-10 pr-4 py-3 rounded-xl border-gray-200 bg-gray-50 text-gray-900 focus:bg-white focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 transition-all font-mono"
                                    disabled={activeConnection?.status !== 'connected'}
                                />
                            </div>
                            <div className="mt-2 flex items-start gap-2 text-xs text-amber-600 bg-amber-50 p-2 rounded-lg border border-amber-100">
                                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                                <p>Minimum 500ms required to reduce ban risk. Recommended 1000ms+.</p>
                            </div>
                        </div>

                        <div className="pt-4">
                            <button
                                type="submit"
                                disabled={isBroadcasting || activeConnection?.status !== 'connected'}
                                className="w-full flex justify-center items-center py-4 px-4 rounded-xl shadow-lg shadow-purple-500/20 text-sm font-bold text-white bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 disabled:from-gray-300 disabled:to-gray-400 disabled:shadow-none disabled:cursor-not-allowed transition-all transform active:scale-[0.99]"
                            >
                                {isBroadcasting ? (
                                    <>Processing Broadcast...</>
                                ) : (
                                    <><Send className="w-5 h-5 mr-2" /> Start Broadcast</>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            </form>
        </div>
    );
};

export default BroadcastSender;
