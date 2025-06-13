// Replace any problematic code like this:
// import SomeClientModule from '../../../../components/SomeClientModule';
// const someFunction = SomeClientModule.someMethod; // This causes the error

import { NewTemplateForm } from '../../../../../components/admin/NewTemplateForm';

export default function NewLayoutTemplatePage() {
  return (
    <div className="container mx-auto py-8">
      <h1 className="text-2xl font-bold mb-6">Create New Layout Template</h1>
      <NewTemplateForm />
    </div>
  );
}
