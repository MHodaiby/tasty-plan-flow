# Meal Plan Express

Build a responsive web application for a meal subscription service.

The goal is to create an MVP that allows customers to create an account, request a meal subscription, have the subscription manually approved and activated by an administrator after payment, and then select their meals for each upcoming week.

Do NOT implement online payments yet. Payment will initially be handled manually by the administrator using an external payment link.

Technology

Use:

React

TypeScript

Tailwind CSS

A clean component-based architecture

Supabase for authentication and PostgreSQL database if appropriate for the Lovable environment

Build the application so that the backend/database structure can later support online payments, notifications, delivery management and additional subscription features.

Prioritize clean architecture, maintainability, responsive design and clear separation between customer and admin functionality.

User roles

There are two roles:

Customer

Admin

Customers must only be able to access their own account, subscription and meal selections.

Admins can manage customers, subscriptions, meals and weekly menus.

Customer registration

Create a registration page where the customer can create an account.

Collect:

Full name

Email

Phone number

Password

Delivery address

Validate required fields and provide clear validation/error messages.

After registration, the customer should be able to log in.

Customer dashboard

After logging in, display a dashboard showing:

Customer name

Current subscription status

Subscription type

Number of meals/days per week

Subscription start date

Default subscription days

Upcoming meal-selection deadline

Upcoming meals

Quick action to select/change meals

If the customer does not currently have an active subscription, clearly show an option to request a subscription.

Subscription request

Create a subscription request form.

The customer must select:

Subscription billing period

Weekly

Monthly

Number of subscription days

3 days per week

5 days per week

Default days of the week

Allow the customer to select exactly the number of days corresponding to their selected plan.

For example:

If they select 3 days/week, they must select exactly 3 days.

If they select 5 days/week, they must select exactly 5 days.

Days:

Sunday

Monday

Tuesday

Wednesday

Thursday

Friday

Saturday

Allow the customer to review their choices before submitting.

After submission, show the request as:

"Pending Payment"

Explain that an administrator will contact/send the customer a payment link and activate the subscription after payment is confirmed.

Do not process payment inside the application.

Subscription statuses

Use clear subscription/request statuses:

Pending Payment

Active

Paused

Expired

Cancelled

A subscription request must NOT automatically become active.

Only an administrator can activate the subscription.

Admin dashboard

Create a separate admin dashboard.

The admin should be able to see:

Total customers

Pending subscription requests

Active subscriptions

Subscriptions requiring attention

Upcoming meal selections

Create navigation for:

Dashboard

Customers

Subscription Requests

Active Subscriptions

Meals

Weekly Menus

Meal Selections

Subscription request management

Admins should be able to:

View subscription requests

View customer details

View requested subscription type

View days per week

View selected default days

Approve/activate the subscription

Reject/cancel a request

Record that payment has been received

When activating a subscription, the admin should be able to specify the subscription start date.

Do not implement an automated payment gateway.

Meal management

Admins should be able to create and manage meals.

Each meal should have:

Name

Description

Image

Category

Active/inactive status

Examples:

Grilled Chicken

Beef Pasta

Chicken Rice Bowl

Salmon

Vegetarian Bowl

Create a clean meal-management interface with cards or a table.

Weekly menus

The admin should be able to create a menu for a specific week.

A weekly menu should contain the meals available for that week.

For example:

Week starting Sunday 11 October:

Grilled Chicken

Beef Pasta

Salmon

Chicken Rice Bowl

Vegetarian Bowl

Admins should be able to publish/unpublish the weekly menu.

Only published meals should be available for customers to select.

Customer weekly meal selection

This is one of the most important parts of the application.

Customers with an active subscription should be able to select their meals for the upcoming week.

Display the customer's subscribed days.

For example:

Sunday
[ Select meal ]

Tuesday
[ Select meal ]

Thursday
[ Select meal ]

For each subscribed day, the customer selects one available meal from the published weekly menu.

Use attractive meal cards showing:

Meal image

Meal name

Short description

Select button

Clearly indicate selected meals.

Allow the customer to change their selection until the weekly meal-selection deadline.

After the deadline, selections become locked and the customer can no longer change them.

The deadline should be configurable rather than hard-coded.

For example:
"Meal selection closes every Thursday at 8:00 PM for the following week."

The UI should clearly display the deadline.

Meal selection rules

Enforce these rules on the backend, not only in the frontend:

Only active subscriptions can select meals.

Customers can only select meals for their own subscription.

Customers can only select meals for their subscribed days.

Customers cannot select meals after the deadline.

Customers cannot select unavailable/unpublished meals.

A customer must have one meal selected for each subscribed day before the week is finalized.

Admin meal-selection view

Create a page allowing administrators to see all meal selections for an upcoming week.

Provide filters for:

Date

Meal

Customer

Subscription

Create a useful kitchen-oriented view.

For example:

Sunday 11 October

Grilled Chicken — 24
Beef Pasta — 18
Salmon — 12
Vegetarian Bowl — 7

Also allow the admin to view the individual customers associated with each meal.

This should make it easy for the restaurant to know how many of each meal needs to be prepared.

Customer profile

Allow customers to view and edit:

Full name

Email

Phone number

Delivery address

Do not allow customers to change their account role.

UI/UX

Create a modern, clean and premium meal-service design.

The design should feel like a professional meal subscription/food service rather than a generic admin template.

Use:

Clean typography

Generous spacing

Rounded cards

High-quality food imagery

Clear primary actions

Responsive layouts

Mobile-first customer experience

The customer meal-selection interface should be particularly polished because customers will likely use it from their phones.

Use a consistent design system across the application.

Use realistic placeholder meal images and content where necessary.

Navigation

Customer navigation:

Dashboard

My Subscription

Choose Meals

Profile

Admin navigation:

Dashboard

Customers

Subscription Requests

Subscriptions

Meals

Weekly Menus

Meal Selections

Security

Implement proper authentication and authorization.

Customers must not be able to access admin pages or other customers' data.

Admins must be able to manage customer subscriptions and meal selections.

Use database-level security/RLS where applicable.

Never store plaintext passwords.

Validate important business rules on the backend/database rather than relying only on frontend validation.

Important MVP constraints

Do NOT build the following yet:

Online payment processing

Automated recurring payments

Delivery-driver management

Live delivery tracking

Mobile applications

Loyalty points

Referral systems

Complex discounts

AI meal recommendations

Automated WhatsApp messaging

The application should be designed so these features can be added later, but do not implement them now.

Development approach

First create the application structure, database schema and core authentication.

Then implement:

Authentication

Customer profile

Subscription requests

Admin subscription management

Meal management

Weekly menus

Customer meal selection

Admin meal-selection/reporting interface

Do not create fake functionality that appears to work only in the UI. Connect the relevant features to the actual database.

Before implementing each major feature, make sure the data model supports the required business logic.

Use reusable components and avoid duplicating code.

Seed the application with realistic demo data so the customer and admin dashboards can be tested immediately.

Create one demo admin account and several demo customers/subscriptions for development/testing.

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/c069dbcc-952c-5833-b929-6d8833a1f716).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
