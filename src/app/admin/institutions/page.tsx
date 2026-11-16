import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { Badge, Field, Flash, PageHeader, Table, type SP } from "@/components/ui";
import { SubmitButton } from "@/components/submit-button";
import { createInstitution, switchInstitution, toggleInstitution } from "@/app/actions/admin";

export default async function AdminInstitutions({ searchParams }: { searchParams: Promise<SP> }) {
  const sp = await searchParams;
  const { institutionId, isSuper } = await requireAdmin();
  const list = await prisma.institution.findMany({
    where: isSuper ? {} : { id: institutionId },
    include: { _count: { select: { students: true, teachers: true, classSections: true } } },
    orderBy: { name: "asc" },
  });
  return (
    <>
      <PageHeader title={isSuper ? "Institutions" : "Institution"} subtitle={isSuper ? "Platform Super Admin: manage schools and colleges." : "Your institution."} />
      <Flash sp={sp} />
      <Table head={["Name", "Code", "Type", "Students", "Teachers", "Classes", "Status", ""]}>
        {list.map((i) => (
          <tr key={i.id}>
            <td className="td font-medium">{i.name}{i.id === institutionId && <span className="ml-2 text-xs text-blue-600">(current)</span>}</td>
            <td className="td">{i.code}</td><td className="td">{i.type === "SCHOOL" ? "School" : "College"}</td>
            <td className="td">{i._count.students}</td><td className="td">{i._count.teachers}</td><td className="td">{i._count.classSections}</td>
            <td className="td"><Badge tone={i.isActive ? "green" : "red"}>{i.isActive ? "Active" : "Inactive"}</Badge></td>
            <td className="td whitespace-nowrap">
              {isSuper && (<>
                <form action={switchInstitution} className="mr-2 inline"><input type="hidden" name="institutionId" value={i.id} /><SubmitButton variant="btn-outline" className="btn-sm">Manage</SubmitButton></form>
                <form action={toggleInstitution} className="inline"><input type="hidden" name="institutionId" value={i.id} /><SubmitButton variant="btn-outline" className="btn-sm" confirm="Change this institution's active status?">{i.isActive ? "Deactivate" : "Activate"}</SubmitButton></form>
              </>)}
            </td>
          </tr>
        ))}
      </Table>
      {isSuper && (
        <form action={createInstitution} className="card mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <h2 className="font-bold text-navy-900 sm:col-span-2 lg:col-span-3">Add institution + its administrator</h2>
          <Field label="Name"><input name="name" required className="input" /></Field>
          <Field label="Code"><input name="code" required placeholder="DPS-NOIDA" className="input" /></Field>
          <Field label="Type"><select name="type" className="input"><option value="SCHOOL">School</option><option value="COLLEGE">College</option></select></Field>
          <Field label="Address"><input name="address" className="input" /></Field>
          <Field label="Admin name"><input name="adminName" required className="input" /></Field>
          <Field label="Admin email"><input name="adminEmail" type="email" required className="input" /></Field>
          <Field label="Admin ID"><input name="adminLoginId" required minLength={3} className="input" /></Field>
          <Field label="Admin password"><input name="adminPassword" required minLength={8} className="input" /></Field>
          <div className="flex items-end"><SubmitButton>Create institution</SubmitButton></div>
        </form>
      )}
    </>
  );
}
