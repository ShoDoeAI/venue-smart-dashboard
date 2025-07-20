import React from 'react';
import { ChatInterface } from '../components/chat/chat-interface';

export default function AIAssistant() {
  return (
    <div className="h-full flex flex-col">
      <ChatInterface />
    </div>
  );
}