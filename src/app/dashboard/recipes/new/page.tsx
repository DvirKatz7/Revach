import { createRecipe } from '../actions'

export default async function NewRecipePage() {
  await createRecipe()
}
