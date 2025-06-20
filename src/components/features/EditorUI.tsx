
"use client";
import React from 'react';
import ImageWorkspace from './ImageWorkspace';
import RosterPanel from './RosterPanel';

const EditorUI = () => {
  return (
    <div className="flex flex-col md:flex-row gap-6 md:gap-8 h-full flex-grow py-6">
      {/* Image Workspace Area */}
      <div className="md:w-2/3 lg:w-3/4 flex flex-col gap-4">
        <ImageWorkspace />
      </div>

      {/* Roster Panel Area */}
      <div className="md:w-1/3 lg:w-1/4 flex flex-col">
        <RosterPanel />
      </div>
    </div>
  );
};

export default EditorUI;
