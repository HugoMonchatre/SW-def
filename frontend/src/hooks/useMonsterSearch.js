import { useState, useEffect, useCallback } from 'react';
import api from '../services/api';

export function useMonsterSearch({ endpoint = '/defenses/monsters/search', filterResults } = {}) {
  const [monsterSearch, setMonsterSearch] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [activeSlot, setActiveSlot] = useState(null);

  const searchMonsters = useCallback(async (query) => {
    if (!query || query.length < 1) {
      setSearchResults([]);
      return;
    }

    setSearchLoading(true);
    try {
      const response = await api.get(endpoint, { params: { query } });
      let results = response.data.results || [];
      if (filterResults) {
        results = filterResults(results);
      }
      setSearchResults(results);
    } catch (error) {
      console.error('Error searching monsters:', error);
      setSearchResults([]);
    } finally {
      setSearchLoading(false);
    }
  }, [endpoint, filterResults]);

  useEffect(() => {
    const debounce = setTimeout(() => {
      if (monsterSearch) {
        searchMonsters(monsterSearch);
      }
    }, 300);

    return () => clearTimeout(debounce);
  }, [monsterSearch, searchMonsters]);

  const clearSearch = useCallback(() => {
    setActiveSlot(null);
    setMonsterSearch('');
    setSearchResults([]);
  }, []);

  return {
    monsterSearch,
    setMonsterSearch,
    searchResults,
    searchLoading,
    activeSlot,
    setActiveSlot,
    clearSearch,
  };
}
