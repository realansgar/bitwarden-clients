import { inject } from "@angular/core";
import {
  ActivatedRouteSnapshot,
  CanActivateFn,
  Router,
  RouterStateSnapshot,
} from "@angular/router";
import { firstValueFrom, switchMap } from "rxjs";

import { OrganizationService } from "@bitwarden/common/admin-console/abstractions/organization/organization.service.abstraction";
import { AccountService } from "@bitwarden/common/auth/abstractions/account.service";
import { getUserId } from "@bitwarden/common/auth/services/account.service";
import { getById } from "@bitwarden/common/platform/misc";

/**
 * `CanActivateFn` that verifies the organization matching the id in the URL
 * parameters exists before allowing navigation.
 */
export function isPaidOrgGuard(): CanActivateFn {
  return async (route: ActivatedRouteSnapshot, _state: RouterStateSnapshot) => {
    const router = inject(Router);
    const organizationService = inject(OrganizationService);
    const accountService = inject(AccountService);

    const org = await firstValueFrom(
      accountService.activeAccount$.pipe(
        getUserId,
        switchMap((userId) => organizationService.organizations$(userId)),
        getById(route.params.organizationId),
      ),
    );

    if (org == null) {
      return router.createUrlTree(["/"]);
    }

    return true;
  };
}
