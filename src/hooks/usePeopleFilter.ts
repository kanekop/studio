import { useMemo } from 'react';
import type { Person, AdvancedSearchParams } from '@/types';

export interface FilterOptions {
  searchQuery: string;
  companyFilter: string | null;
  advancedParams?: AdvancedSearchParams;
  sortOption?: 'createdAt_desc' | 'createdAt_asc' | 'name_asc' | 'name_desc';
}

export interface UseGroupedPeopleResult {
  all: Person[];
  byCompany: Record<string, Person[]>;
  byFirstLetter: Record<string, Person[]>;
  companies: string[];
  totalCount: number;
}

// メイン人物フィルタリングフック
export function usePeopleFilter(
  people: Person[],
  options: FilterOptions
): Person[] {
  return useMemo(() => {
    const { searchQuery, companyFilter, advancedParams, sortOption = 'createdAt_desc' } = options;
    
    let filtered = [...people];

    // 基本的な文字列検索
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      filtered = filtered.filter(person => {
        const searchableText = [
          person.name,
          person.company,
          person.hobbies,
          person.notes,
          person.firstMetContext,
        ].filter(Boolean).join(' ').toLowerCase();
        
        return searchableText.includes(query);
      });
    }

    // 会社フィルター
    if (companyFilter && companyFilter !== 'all' && companyFilter !== '') {
      filtered = filtered.filter(person => person.company === companyFilter);
    }

    // 高度な検索パラメータ
    if (advancedParams) {
      // 名前での検索（高度版）
      if (advancedParams.name?.trim()) {
        const nameQuery = advancedParams.name.toLowerCase().trim();
        filtered = filtered.filter(person =>
          person.name?.toLowerCase().includes(nameQuery) || false
        );
      }

      // 会社での検索（高度版）
      if (advancedParams.company && advancedParams.company !== 'all') {
        filtered = filtered.filter(person => person.company === advancedParams.company);
      }

      // メモでの検索
      if (advancedParams.notes?.trim()) {
        const notesQuery = advancedParams.notes.toLowerCase().trim();
        filtered = filtered.filter(person =>
          person.notes?.toLowerCase().includes(notesQuery) || false
        );
      }

      // 年齢範囲フィルター
      if (advancedParams.ageRange) {
        const { min, max } = advancedParams.ageRange;
        if (min !== null) {
          filtered = filtered.filter(person =>
            person.age !== undefined && person.age >= min
          );
        }
        if (max !== null) {
          filtered = filtered.filter(person =>
            person.age !== undefined && person.age <= max
          );
        }
      }

      // 趣味フィルター
      if (advancedParams.hobbies && advancedParams.hobbies.length > 0) {
        filtered = filtered.filter(person => {
          if (!person.hobbies) return false;
          const personHobbies = person.hobbies.toLowerCase();
          return advancedParams.hobbies?.some(hobby =>
            personHobbies.includes(hobby.toLowerCase())
          ) || false;
        });
      }

      // 誕生日範囲フィルター
      if (advancedParams.birthdayRange) {
        const { start, end } = advancedParams.birthdayRange;
        filtered = filtered.filter(person => {
          if (!person.birthday) return false;
          try {
            const personBirthday = new Date(person.birthday);
            return personBirthday >= start && personBirthday <= end;
          } catch {
            return false;
          }
        });
      }

      // 初回会った日の範囲フィルター
      if (advancedParams.firstMetRange) {
        const { start, end } = advancedParams.firstMetRange;
        filtered = filtered.filter(person => {
          if (!person.firstMet) return false;
          try {
            const firstMetDate = new Date(person.firstMet);
            return firstMetDate >= start && firstMetDate <= end;
          } catch {
            return false;
          }
        });
      }
    }

    // ソート
    filtered.sort((a, b) => {
      switch (sortOption) {
        case 'name_asc':
          return (a.name || '').localeCompare(b.name || '');
        case 'name_desc':
          return (b.name || '').localeCompare(a.name || '');
        case 'createdAt_asc':
          return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
        case 'createdAt_desc':
        default:
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      }
    });

    return filtered;
  }, [people, options]);
}

// 会社別グループ化
export function useGroupedPeople(
  people: Person[],
  filterOptions: FilterOptions
): UseGroupedPeopleResult {
  const filteredPeople = usePeopleFilter(people, filterOptions);

  return useMemo(() => {
    // 会社別グループ化
    const byCompany = filteredPeople.reduce((acc, person) => {
      const company = person.company || '未分類';
      if (!acc[company]) {
        acc[company] = [];
      }
      acc[company].push(person);
      return acc;
    }, {} as Record<string, Person[]>);

    // 名前の最初の文字でグループ化
    const byFirstLetter = filteredPeople.reduce((acc, person) => {
      const firstLetter = person.name?.charAt(0).toUpperCase() || '#';
      if (!acc[firstLetter]) {
        acc[firstLetter] = [];
      }
      acc[firstLetter].push(person);
      return acc;
    }, {} as Record<string, Person[]>);

    // 会社リスト（ソート済み）
    const companies = Object.keys(byCompany).sort((a, b) => {
      if (a === '未分類') return 1;
      if (b === '未分類') return -1;
      return a.localeCompare(b);
    });

    return {
      all: filteredPeople,
      byCompany,
      byFirstLetter,
      companies,
      totalCount: filteredPeople.length,
    };
  }, [filteredPeople]);
}

// 検索候補の取得
export function useSearchSuggestions(people: Person[]) {
  return useMemo(() => {
    const suggestions = {
      companies: [] as string[],
      hobbies: [] as string[],
      locations: [] as string[],
    };

    people.forEach(person => {
      // 会社の候補
      if (person.company && !suggestions.companies.includes(person.company)) {
        suggestions.companies.push(person.company);
      }

      // 趣味の候補（カンマ区切りで分割）
      if (person.hobbies) {
        const hobbies = person.hobbies.split(',').map(h => h.trim()).filter(Boolean);
        hobbies.forEach(hobby => {
          if (!suggestions.hobbies.includes(hobby)) {
            suggestions.hobbies.push(hobby);
          }
        });
      }

      // 初回会った場所（firstMetContextから抽出）
      if (person.firstMetContext) {
        const context = person.firstMetContext.toLowerCase();
        // 簡単な場所キーワードマッチング
        const locationKeywords = ['会社', 'オフィス', '大学', '学校', 'カフェ', 'レストラン', '駅', '空港'];
        locationKeywords.forEach(keyword => {
          if (context.includes(keyword) && !suggestions.locations.includes(keyword)) {
            suggestions.locations.push(keyword);
          }
        });
      }
    });

    // ソート
    suggestions.companies.sort();
    suggestions.hobbies.sort();
    suggestions.locations.sort();

    return suggestions;
  }, [people]);
}

// フィルター統計の取得
export function useFilterStats(
  originalPeople: Person[],
  filteredPeople: Person[]
) {
  return useMemo(() => {
    const totalCount = originalPeople.length;
    const filteredCount = filteredPeople.length;
    const filteredPercentage = totalCount > 0 ? (filteredCount / totalCount) * 100 : 0;

    // 会社別統計
    const companyStats = filteredPeople.reduce((acc, person) => {
      const company = person.company || '未分類';
      acc[company] = (acc[company] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // 年代別統計（10歳刻み）
    const ageStats = filteredPeople.reduce((acc, person) => {
      if (person.age) {
        const ageGroup = `${Math.floor(person.age / 10) * 10}代`;
        acc[ageGroup] = (acc[ageGroup] || 0) + 1;
      }
      return acc;
    }, {} as Record<string, number>);

    return {
      totalCount,
      filteredCount,
      filteredPercentage,
      companyStats,
      ageStats,
      isFiltered: filteredCount < totalCount,
    };
  }, [originalPeople, filteredPeople]);
}