import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthService } from '../../../core/services/auth.service';
import { ToastService } from '../../../core/services/toast.service';
import { LoginComponent } from './login.component';

describe('LoginComponent', () => {
  let component: LoginComponent;
  let auth: {
    requestOtp: ReturnType<typeof vi.fn>;
    verifyLoginOtp: ReturnType<typeof vi.fn>;
  };

  beforeEach(async () => {
    auth = {
      requestOtp: vi.fn().mockResolvedValue({ devOtp: '123456' }),
      verifyLoginOtp: vi.fn().mockResolvedValue({
        name: 'Aarav Sharma',
        location: { lat: 1, lng: 1 },
      }),
    };

    await TestBed.configureTestingModule({
      imports: [LoginComponent],
      providers: [
        provideRouter([]),
        { provide: AuthService, useValue: auth },
        { provide: ToastService, useValue: { success: vi.fn(), error: vi.fn() } },
      ],
    }).compileComponents();

    component = TestBed.createComponent(LoginComponent).componentInstance;
  });

  it('does not verify a consumed OTP twice', async () => {
    component.phoneInput = '9876543210';
    component.phoneValid.set(true);
    await component.onSubmitIdentity({ preventDefault() {} } as Event);
    component.otpDigits.set(['1', '2', '3', '4', '5', '6']);
    component.resendCooldown.set(30);

    await component.onSubmitOtp({ preventDefault() {} } as Event);
    await component.onSubmitOtp({ preventDefault() {} } as Event);

    expect(auth.verifyLoginOtp).toHaveBeenCalledTimes(1);
    expect(component.verified()).toBe(true);
    expect(component.error()).toBeNull();
  });
});
