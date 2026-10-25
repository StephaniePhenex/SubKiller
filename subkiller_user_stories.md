# SubKiller - User Stories & Acceptance Criteria

**Technical Constraint:** Must utilize React for complex state management on the frontend and Supabase/external DB for backend data persistence and aggregate queries.

## US 1: Voice Input
**Story:** As a frustrated user, I want to simply speak out my subscription details (what it is, how much it costs, how often I use it, and how I feel about it) so that I don't have to go through the friction of typing and filling out a long manual form.

**Acceptance Criteria:**
*   System correctly requests and handles microphone permissions when the record button is clicked.
*   UI clearly displays three distinct status indicators: Ready, Recording, and Processing.
*   Upon successful AI parsing, extracted data automatically populates an editable frontend confirmation form for final manual review.

## US 2: AI-Powered Importance Score
**Story:** As a user struggling with cancellation decisions, I want the system to analyze my voice input (cost, frequency, sentiment) and generate a 0-100 'Importance Score' with a brief verdict, so that I can get an objective reality-check on whether I should keep it.

**Acceptance Criteria:**
*   Backend prompt forces the LLM to output a strict JSON format containing a score (0-100) and a verdict (a one-sentence summary).
*   Frontend subscription cards conditionally render color-coded warnings based on the score (e.g., Red for 0-30, Yellow for 30-70, Green for 70-100).

## US 3: Subscription Graveyard Dashboard
**Story:** As a user managing multiple subscriptions, I want to see all my identified 'vampire' subscriptions listed in a dashboard, so that I can easily track what I am paying for and what needs to be canceled.

**Acceptance Criteria:**
*   Frontend successfully fetches and renders a list of subscriptions (Name, Cost, AI Score) from the Supabase database.
*   List automatically sorts items either chronologically or by AI Score from lowest to highest (prioritizing the most urgent cancellations).
*   Constraint: Displays as a simple text/card list only. No complex pagination animations or dynamic image generation logic is permitted.

## US 4: What-If Savings Simulator
**Story:** As an indecisive user, I want to be able to select and deselect different subscriptions in my Graveyard, so that I can instantly simulate the financial impact and see how much I would save.

**Acceptance Criteria:**
*   Each subscription card includes a checkbox or toggle switch.
*   Checkbox toggles trigger immediate, real-time frontend state updates without requiring backend API calls.
*   Fulfills the "Complex State Management" requirement through real-time data array manipulation and UI updates.

## US 5: Total Money Saved
**Story:** As a budget-conscious user, I want to see the total aggregated amount of money I am wasting (or saving) calculated on a monthly and yearly basis, so that I feel a strong sense of financial accomplishment.

**Acceptance Criteria:**
*   Backend calculates the baseline total amount utilizing a database aggregate query (e.g., SQL SUM) rather than purely frontend calculation to satisfy DB grading rubric requirements.
*   The aggregated figure is displayed prominently at the top of the dashboard.
*   System dynamically recalculates and updates the total in real-time when the What-If Simulator is toggled, showing the difference between "current waste" and "simulated savings."