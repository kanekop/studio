
'use server';
/**
 * @fileOverview A function to suggest potential merges between people based on name similarity.
 * This is an initial placeholder and does not use actual AI image analysis yet.
 *
 * - suggestPeopleMerges - A function that handles the merge suggestion process.
 * - SuggestMergeInput - The input type for the suggestPeopleMerges function.
 * - SuggestMergeOutput - The return type for the suggestPeopleMerges function.
 */

import { z } from 'zod';

const SuggestMergePersonSchema = z.object({
  id: z.string().describe('The unique identifier of the person.'),
  name: z.string().describe('The name of the person.'),
});
export type SuggestMergeInput = z.infer<typeof SuggestMergePersonSchema>;

const SuggestedMergePairSchema = z.object({
  person1Id: z.string(),
  person1Name: z.string(),
  person2Id: z.string(),
  person2Name: z.string(),
  reason: z.string(),
  confidence: z.enum(['high', 'medium', 'low']).optional(),
});
export type SuggestMergeOutput = z.infer<typeof SuggestedMergePairSchema>;


function levenshteinDistance(a: string, b: string): number {
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;

  const matrix = [];

  for (let i = 0; i <= b.length; i++) {
    matrix[i] = [i];
  }

  for (let j = 0; j <= a.length; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1, // substitution
          matrix[i][j - 1] + 1,     // insertion
          matrix[i - 1][j] + 1      // deletion
        );
      }
    }
  }
  return matrix[b.length][a.length];
}

export async function suggestPeopleMerges(peopleList: SuggestMergeInput): Promise<SuggestMergeOutput> {
  const suggestions: SuggestMergeOutput = [];
  const processedPairs = new Set<string>();

  for (let i = 0; i < peopleList.length; i++) {
    for (let j = i + 1; j < peopleList.length; j++) {
      const person1 = peopleList[i];
      const person2 = peopleList[j];

      const pairKey = [person1.id, person2.id].sort().join('-');
      if (processedPairs.has(pairKey)) {
        continue;
      }
      processedPairs.add(pairKey);

      const name1Lower = person1.name.toLowerCase();
      const name2Lower = person2.name.toLowerCase();

      let isSimilar = false;
      let reason = '';
      let confidence: 'high' | 'medium' | 'low' = 'medium';

      if (name1Lower === name2Lower && person1.id !== person2.id) {
        isSimilar = true;
        reason = 'Exact name match (different IDs).';
        confidence = 'high';
      } else if (name1Lower.includes(name2Lower) || name2Lower.includes(name1Lower)) {
        isSimilar = true;
        reason = 'One name is part of the other.';
        confidence = 'medium';
      } else {
        const distance = levenshteinDistance(name1Lower, name2Lower);
        const maxLength = Math.max(name1Lower.length, name2Lower.length);
        // Threshold: Allow up to 25% difference in length for similarity, minimum 1
        const threshold = Math.max(1, Math.floor(maxLength / 4)); 
        if (distance > 0 && distance <= threshold) {
          isSimilar = true;
          reason = `Names are very similar (Levenshtein distance: ${distance}).`;
          confidence = distance === 1 ? 'medium' : 'low';
        }
      }
      
      if (isSimilar) {
        suggestions.push({
          person1Id: person1.id,
          person1Name: person1.name,
          person2Id: person2.id,
          person2Name: person2.name,
          reason: `${reason} (This is a placeholder, full AI image analysis pending.)`,
          confidence: confidence,
        });
      }
    }
  }
  return suggestions;
}

