
'use server';
/**
 * @fileOverview A Genkit flow to suggest potential merges between people based on textual similarity using an AI model.
 *
 * - suggestPeopleMerges - An async wrapper function that invokes the Genkit flow.
 * - SuggestMergeInput - The TypeScript type for the input to the suggestPeopleMerges function.
 * - SuggestMergeOutput - The TypeScript type for the output from the suggestPeopleMerges function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

// Input schema for a single person, now including company and hobbies
const SuggestMergePersonSchema = z.object({
  id: z.string().describe('The unique identifier of the person.'),
  name: z.string().describe('The name of the person.'),
  company: z.string().optional().describe('The company the person works for.'),
  hobbies: z.string().optional().describe('The hobbies of the person.'),
});

// Input schema: An array of people
const SuggestMergeInputSchema = z.array(SuggestMergePersonSchema).describe('A list of people to analyze for potential duplicates.');
export type SuggestMergeInput = z.infer<typeof SuggestMergeInputSchema>;


// Output schema for a single suggested pair
const SuggestedMergePairSchema = z.object({
  person1Id: z.string().describe('The ID of the first person in the suggested pair.'),
  person1Name: z.string().describe('The name of the first person.'),
  person2Id: z.string().describe('The ID of the second person in the suggested pair.'),
  person2Name: z.string().describe('The name of the second person.'),
  reason: z.string().describe('The AI-generated reason why these two people might be the same.'),
  confidence: z.enum(['high', 'medium', 'low']).optional().describe('The AI-assessed confidence level of the suggestion.'),
});

// Output schema: An array of suggested pairs
const SuggestMergeOutputSchema = z.array(SuggestedMergePairSchema).describe('A list of suggested merge pairs.');
export type SuggestMergeOutput = z.infer<typeof SuggestMergeOutputSchema>;


// Exported async wrapper function that calls the Genkit flow
export async function suggestPeopleMerges(input: SuggestMergeInput): Promise<SuggestMergeOutput> {
  if (!input || input.length < 2) {
    return []; // Not enough people to compare
  }
  return suggestPeopleMergesFlow(input);
}

const suggestPeopleMergesFlowPrompt = ai.definePrompt({
  name: 'suggestPeopleMergesPrompt',
  input: { schema: SuggestMergeInputSchema },
  output: { schema: SuggestMergeOutputSchema },
  prompt: `You are an expert in data deduplication and identifying similar entities.
Given the following list of people, each with an ID, name, and optionally company and hobbies:
{{#each this}}
- Person ID: {{id}}, Name: "{{name}}"{{#if company}}, Company: "{{company}}"{{/if}}{{#if hobbies}}, Hobbies: "{{hobbies}}"{{/if}}
{{/each}}

Your task is to identify pairs of people from this list who are likely to be the same individual.
Consider variations in names (e.g., nicknames like 'Bob' for 'Robert', full names vs. initials like 'J. Smith' vs. 'John Smith', common misspellings, or order of first/last names if applicable).
Use company and hobbies as supporting evidence. Small variations in company names (e.g., 'Corp' vs 'Corporation') or hobby descriptions (e.g., 'hiking' vs 'mountain hiking') should still be considered matches if other information aligns.

For each potential duplicate pair you identify, provide:
- person1Id: The ID of the first person.
- person1Name: The name of the first person.
- person2Id: The ID of the second person.
- person2Name: The name of the second person.
- reason: A concise explanation for why you think they might be the same person.
- confidence: Your confidence level for this suggestion ('high', 'medium', or 'low').

Ensure person1Id and person2Id are different.
If no potential duplicates are found, return an empty list.
Present your findings as a list of objects matching the output schema.
Prioritize identifying likely duplicates. If unsure but there's reasonable similarity, lean towards suggesting a merge with a 'medium' or 'low' confidence, clearly stating the reason for the uncertainty.

Example of a good reason (high confidence): "Similar names ('Mike K.' and 'Michael Kane') and both work at 'Tech Solutions Inc.'."
Example of another reason (medium confidence): "Name 'Jennifer Doe' and 'Jen Doe' with overlapping hobbies like 'Reading fiction' and 'Book club', and similar company 'Innovate Ltd' vs 'Innovate Limited'."
Example of another reason (low confidence): "Names 'Alex Chen' and 'A. Chen' are similar; no other overlapping info to increase confidence."
`,
});

const suggestPeopleMergesFlow = ai.defineFlow(
  {
    name: 'suggestPeopleMergesFlow',
    inputSchema: SuggestMergeInputSchema,
    outputSchema: SuggestMergeOutputSchema,
  },
  async (peopleList) => {
    if (peopleList.length < 2) {
        return [];
    }
    try {
      const { output } = await suggestPeopleMergesFlowPrompt(peopleList);
      if (!output) {
        console.warn("AI merge suggestion prompt returned null output.");
        return [];
      }
      // Ensure IDs are not the same within a pair (should be handled by prompt, but good to double check)
      return output.filter(pair => pair.person1Id !== pair.person2Id);
    } catch (error) {
      console.error('Error in suggestPeopleMergesFlow:', error);
      // Consider how to propagate this error or return an empty list
      // For now, returning empty list on error to avoid breaking UI
      return [];
    }
  }
);
