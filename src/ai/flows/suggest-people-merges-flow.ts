
'use server';
/**
 * @fileOverview A Genkit flow to suggest potential merges between people based on textual and visual similarity using an AI model.
 *
 * - suggestPeopleMerges - An async wrapper function that invokes the Genkit flow.
 * - SuggestMergeInput - The TypeScript type for the input to the suggestPeopleMerges function.
 * - SuggestMergeOutput - The TypeScript type for the output from the suggestPeopleMerges function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

// Input schema for a single person, now including company, hobbies, and optional face image data URI
const SuggestMergePersonSchema = z.object({
  id: z.string().describe('The unique identifier of the person.'),
  name: z.string().describe('The name of the person.'),
  company: z.string().optional().describe('The company the person works for.'),
  hobbies: z.string().optional().describe('The hobbies of the person.'),
  faceImageDataUri: z.string().optional().describe("A representative face image as a Base64 data URI. Format: 'data:<mimetype>;base64,<encoded_data>'."),
});

// Input schema: An array of people
const SuggestMergeInputSchema = z.array(SuggestMergePersonSchema).describe('A list of people to analyze for potential duplicates, including textual details and optional face images.');
export type SuggestMergeInput = z.infer<typeof SuggestMergePersonSchema>[];


// Output schema for a single suggested pair
const SuggestedMergePairSchema = z.object({
  person1Id: z.string().describe('The ID of the first person in the suggested pair.'),
  person1Name: z.string().describe('The name of the first person.'),
  person2Id: z.string().describe('The ID of the second person in the suggested pair.'),
  person2Name: z.string().describe('The name of the second person.'),
  reason: z.string().describe('The AI-generated reason why these two people might be the same, considering both visual and textual evidence.'),
  confidence: z.enum(['high', 'medium', 'low']).optional().describe('The AI-assessed confidence level of the suggestion based on all available evidence.'),
});

// Output schema: An array of suggested pairs
const SuggestMergeOutputSchema = z.array(SuggestedMergePairSchema).describe('A list of suggested merge pairs based on textual and visual analysis.');
export type SuggestMergeOutput = z.infer<typeof SuggestedMergePairSchema>[];


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
Given the following list of people, each with an ID, name, and optionally company, hobbies, and a face image:
{{#each this}}
- Person ID: {{id}}, Name: "{{name}}"
  {{#if company}}Company: "{{company}}"{{/if}}
  {{#if hobbies}}Hobbies: "{{hobbies}}"{{/if}}
  {{#if faceImageDataUri}}Image: {{media url=faceImageDataUri}}{{/if}}
{{/each}}

Your task is to identify pairs of people from THIS LIST who are likely to be the same individual.
Consider the following factors:
1.  **Visual Similarity**: If face images are provided for a pair, assess if they depict the same person. This is a strong indicator.
2.  **Textual Similarity**:
    *   Variations in names (e.g., nicknames like 'Bob' for 'Robert', full names vs. initials like 'J. Smith' vs. 'John Smith', common misspellings, or order of first/last names).
    *   Similarity in company names (e.g., 'Corp' vs 'Corporation').
    *   Overlapping or similar hobbies (e.g., 'hiking' vs 'mountain hiking').

For each potential duplicate pair you identify, provide:
- person1Id: The ID of the first person.
- person1Name: The name of the first person.
- person2Id: The ID of the second person.
- person2Name: The name of the second person.
- reason: A concise explanation for why you think they might be the same person, explicitly mentioning if visual similarity was a factor.
- confidence: Your confidence level ('high', 'medium', or 'low'). 'High' confidence should be reserved for strong visual matches corroborated by text, or very strong textual matches. 'Medium' for good textual similarity with some visual cues or vice-versa. 'Low' for weaker similarities that are still worth investigating.

Ensure person1Id and person2Id are different.
If no potential duplicates are found, return an empty list.
Prioritize identifying likely duplicates. If unsure but there's reasonable similarity (either textually or visually, or a combination), lean towards suggesting a merge with a 'medium' or 'low' confidence, clearly stating the reason.

Example (High Confidence): "Visually similar faces and similar names ('Mike K.' and 'Michael Kane') and both work at 'Tech Solutions Inc.'."
Example (Medium Confidence): "Names 'Jennifer Doe' and 'Jen Doe' with overlapping hobbies. Faces look somewhat similar but image quality is low."
Example (Low Confidence): "Names 'Alex Chen' and 'A. Chen' are similar; no image provided for one or both, or images are inconclusive. No other overlapping info."
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
      // Use a model capable of image understanding if images are present
      // Assuming 'gemini-pro-vision' or a similar multimodal model is configured in genkit.ts if images are consistently passed.
      // The prompt itself will handle the {{media}} helper.
      const { output } = await suggestPeopleMergesFlowPrompt(peopleList);
      if (!output) {
        console.warn("AI merge suggestion prompt returned null output.");
        return [];
      }
      // Ensure IDs are not the same within a pair
      return output.filter(pair => pair.person1Id !== pair.person2Id);
    } catch (error) {
      console.error('Error in suggestPeopleMergesFlow:', error);
      return [];
    }
  }
);
