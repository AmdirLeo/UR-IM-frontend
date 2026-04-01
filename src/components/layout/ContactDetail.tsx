import React from 'react';
import { MessageSquare } from 'lucide-react';

interface ContactDetailProps {
  contactId: number | null;
  contactName: string | undefined;
  avatarColor: string | undefined;
  onSendMessage: (contactId: number) => void;
}

export const ContactDetail: React.FC<ContactDetailProps> = ({
  contactId,
  contactName,
  avatarColor,
  onSendMessage
}) => {

  if (!contactId || !contactName) {
    return (
      <div className="flex-1 h-full bg-[#F5F5F5] dark:bg-[#111111] flex items-center justify-center min-w-[400px]">
        <div className="text-gray-400 dark:text-gray-500">
          Select a contact to view their profile
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 h-full bg-[#F5F5F5] dark:bg-[#111111] flex flex-col items-center justify-center min-w-[400px]">
      <div className="flex flex-col items-center bg-white dark:bg-[#1E1E1E] p-10 rounded-2xl shadow-sm border border-gray-100 dark:border-[#333333] min-w-[320px]">

        {/* Large Avatar */}
        <div className={`w-24 h-24 rounded-lg overflow-hidden flex items-center justify-center mb-6 shadow-md ${avatarColor || 'bg-gray-400'}`}>
           <span className="text-4xl text-white font-bold opacity-90">
             {contactName.charAt(0)}
           </span>
        </div>

        {/* Profile Info */}
        <h2 className="text-2xl font-medium text-gray-900 dark:text-white mb-2">
          {contactName}
        </h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-8">
          User ID: {contactId}
        </p>

        {/* Action Button */}
        <button
          onClick={() => onSendMessage(contactId)}
          className="flex items-center justify-center space-x-2 w-full py-3 px-6 bg-[#07C160] hover:bg-[#06AD56] text-white rounded-md font-medium transition-colors shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#07C160] dark:focus:ring-offset-[#1E1E1E]"
        >
          <MessageSquare className="w-5 h-5" />
          <span>Send Message</span>
        </button>

      </div>
    </div>
  );
};
