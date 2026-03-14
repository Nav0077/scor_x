'use client';
import { createContext, useContext, useState } from 'react';

const MatchContext = createContext({});

export function MatchProvider({ children }) {
  const [currentMatch, setCurrentMatch] = useState(null);
  const [liveMatches, setLiveMatches] = useState([]);

  return (
    <MatchContext.Provider value={{
      currentMatch,
      setCurrentMatch,
      liveMatches,
      setLiveMatches,
    }}>
      {children}
    </MatchContext.Provider>
  );
}

export const useMatchContext = () => useContext(MatchContext);
