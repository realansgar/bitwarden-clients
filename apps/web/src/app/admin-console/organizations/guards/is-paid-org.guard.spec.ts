import { Component } from "@angular/core";
import { TestBed } from "@angular/core/testing";
import { provideRouter } from "@angular/router";
import { RouterTestingHarness } from "@angular/router/testing";
import { MockProxy, mock } from "jest-mock-extended";
import { of } from "rxjs";

import { OrganizationService } from "@bitwarden/common/admin-console/abstractions/organization/organization.service.abstraction";
import { OrganizationUserType } from "@bitwarden/common/admin-console/enums";
import { Organization } from "@bitwarden/common/admin-console/models/domain/organization";
import { AccountService } from "@bitwarden/common/auth/abstractions/account.service";
import { Utils } from "@bitwarden/common/platform/misc/utils";
import { FakeAccountService, mockAccountServiceWith } from "@bitwarden/common/spec";
import { UserId } from "@bitwarden/common/types/guid";
import { DialogService } from "@bitwarden/components";

import { isPaidOrgGuard } from "./is-paid-org.guard";

// FIXME(https://bitwarden.atlassian.net/browse/CL-764): Migrate to OnPush
// eslint-disable-next-line @angular-eslint/prefer-on-push-component-change-detection
@Component({
  template: "<h1>This is the home screen!</h1>",
  standalone: true,
})
export class HomescreenComponent {}

// FIXME(https://bitwarden.atlassian.net/browse/CL-764): Migrate to OnPush
// eslint-disable-next-line @angular-eslint/prefer-on-push-component-change-detection
@Component({
  template: "<h1>This component can only be accessed by a paid organization!</h1>",
  standalone: true,
})
export class PaidOrganizationOnlyComponent {}

// FIXME(https://bitwarden.atlassian.net/browse/CL-764): Migrate to OnPush
// eslint-disable-next-line @angular-eslint/prefer-on-push-component-change-detection
@Component({
  template: "<h1>This is the organization upgrade screen!</h1>",
  standalone: true,
})
export class OrganizationUpgradeScreenComponent {}

const orgFactory = (props: Partial<Organization> = {}) =>
  Object.assign(
    new Organization(),
    {
      id: "myOrgId",
      enabled: true,
      type: OrganizationUserType.Admin,
    },
    props,
  );

describe("Is Paid Org Guard", () => {
  let organizationService: MockProxy<OrganizationService>;
  let dialogService: MockProxy<DialogService>;
  let routerHarness: RouterTestingHarness;
  let accountService: FakeAccountService;
  const userId = Utils.newGuid() as UserId;

  beforeEach(async () => {
    organizationService = mock<OrganizationService>();
    dialogService = mock<DialogService>();
    accountService = mockAccountServiceWith(userId);

    TestBed.configureTestingModule({
      imports: [
        HomescreenComponent,
        PaidOrganizationOnlyComponent,
        OrganizationUpgradeScreenComponent,
      ],
      providers: [
        { provide: OrganizationService, useValue: organizationService },
        { provide: DialogService, useValue: dialogService },
        { provide: AccountService, useValue: accountService },
        provideRouter([
          {
            path: "",
            component: HomescreenComponent,
          },
          {
            path: "organizations/:organizationId/paidOrganizationsOnly",
            component: PaidOrganizationOnlyComponent,
            canActivate: [isPaidOrgGuard()],
          },
          {
            path: "organizations/:organizationId/billing/subscription",
            component: OrganizationUpgradeScreenComponent,
          },
        ]),
      ],
    });

    routerHarness = await RouterTestingHarness.create();
  });

  it("redirects to `/` if the organization id provided is not found", async () => {
    const org = orgFactory();
    organizationService.organizations$.calledWith(userId).mockReturnValue(of([]));
    await routerHarness.navigateByUrl(`organizations/${org.id}/paidOrganizationsOnly`);
    expect(routerHarness.routeNativeElement?.querySelector("h1")?.textContent?.trim() ?? "").toBe(
      "This is the home screen!",
    );
  });

  it("proceeds with navigation for a free organization", async () => {
    const org = orgFactory({ type: OrganizationUserType.User, useTotp: false });
    organizationService.organizations$.calledWith(userId).mockReturnValue(of([org]));
    await routerHarness.navigateByUrl(`organizations/${org.id}/paidOrganizationsOnly`);
    expect(routerHarness.routeNativeElement?.querySelector("h1")?.textContent?.trim() ?? "").toBe(
      "This component can only be accessed by a paid organization!",
    );
  });

  it("proceeds with navigation if the organization in question is a paid organization", async () => {
    const org = orgFactory({ useTotp: true });
    organizationService.organizations$.calledWith(userId).mockReturnValue(of([org]));
    await routerHarness.navigateByUrl(`organizations/${org.id}/paidOrganizationsOnly`);
    expect(routerHarness.routeNativeElement?.querySelector("h1")?.textContent?.trim() ?? "").toBe(
      "This component can only be accessed by a paid organization!",
    );
  });
});
